<template>
  <div class="error-list">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="项目">
          <el-select
            v-model="filters.projectId"
            placeholder="全部项目"
            clearable
            style="width: 200px"
            @change="handleSearch"
          >
            <el-option
              v-for="project in projectsStore.projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="会话 ID">
          <el-input
            v-model="filters.sessionId"
            placeholder="输入会话 ID"
            clearable
            style="width: 240px"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="eventsStore.loading" @click="handleSearch">
            查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>错误事件列表</span>
          <el-tag type="danger">共 {{ eventsStore.total }} 条</el-tag>
        </div>
      </template>

      <el-table
        v-loading="eventsStore.loading"
        :data="eventsStore.events"
        stripe
        style="width: 100%"
        empty-text="暂无错误事件"
      >
        <el-table-column prop="createdAt" label="发生时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="project.name" label="项目" width="140">
          <template #default="{ row }">
            {{ row.project?.name ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="错误信息" min-width="280">
          <template #default="{ row }">
            <span class="error-message">{{ getErrorMessage(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="140">
          <template #default="{ row }">
            <el-tag size="small" type="warning">{{ getErrorType(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="页面 URL" min-width="200" show-overflow-tooltip />
        <el-table-column prop="sessionId" label="会话 ID" width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.id)">详情</el-button>
            <el-button type="success" link @click="goReplay(row)">回放</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="eventsStore.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useEventsStore } from '@/stores/events';
import { useProjectsStore } from '@/stores/projects';
import type { ErrorPayload, MonitorEvent } from '@/types';
import client from '@/api/client';

const router = useRouter();
const eventsStore = useEventsStore();
const projectsStore = useProjectsStore();

const filters = reactive({
  projectId: '',
  sessionId: '',
});

const currentPage = ref(1);
const pageSize = ref(20);

function getErrorMessage(row: MonitorEvent): string {
  const payload = row.payload as ErrorPayload;
  return payload.message ?? '未知错误';
}

function getErrorType(row: MonitorEvent): string {
  const payload = row.payload as ErrorPayload;
  return payload.type ?? 'Error';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN');
}

async function handleSearch() {
  try {
    await eventsStore.fetchEvents('ERROR', {
      projectId: filters.projectId || undefined,
      sessionId: filters.sessionId || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    });
  } catch {
    ElMessage.error(eventsStore.error ?? '加载失败');
  }
}

function handleReset() {
  filters.projectId = '';
  filters.sessionId = '';
  currentPage.value = 1;
  handleSearch();
}

function goDetail(id: string) {
  router.push(`/errors/${id}`);
}

async function goReplay(row: MonitorEvent) {
  if (!row.sessionId) {
    ElMessage.warning('该事件没有关联会话');
    return;
  }

  try {
    const { data } = await client.get('/events', {
      params: {
        sessionId: row.sessionId,
        type: 'REPLAY',
        page: 1,
        pageSize: 1,
      },
    });

    const replayEvent = data.items?.[0];
    if (replayEvent) {
      router.push(`/replay/${replayEvent.id}`);
    } else {
      ElMessage.warning('未找到该会话的回放记录');
    }
  } catch {
    ElMessage.error('查找回放记录失败');
  }
}

onMounted(async () => {
  await projectsStore.fetchProjects();
  await handleSearch();
});
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.table-card {
  min-height: 400px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.error-message {
  color: #f56c6c;
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
