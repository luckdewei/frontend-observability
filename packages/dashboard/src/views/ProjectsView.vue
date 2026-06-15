<template>
  <div class="projects-view">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>项目列表</span>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            新建项目
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="projectsStore.loading"
        :data="projectsStore.projects"
        stripe
        empty-text="暂无项目，请创建"
      >
        <el-table-column prop="name" label="项目名称" min-width="160" />
        <el-table-column label="App Key" min-width="240">
          <template #default="{ row }">
            <div class="app-key-cell">
              <code class="app-key">{{ row.appKey }}</code>
              <el-button type="primary" link @click="copyAppKey(row.appKey)">
                复制
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="事件数" width="100">
          <template #default="{ row }">
            {{ row._count?.events ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEditDialog(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑项目' : '新建项目'"
      width="480px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
        @submit.prevent
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="App Key" prop="appKey">
          <el-input v-model="form.appKey" placeholder="用于 SDK 鉴权的密钥">
            <template #append>
              <el-button @click="generateAppKey">生成</el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="projectsStore.loading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useProjectsStore } from '@/stores/projects';
import type { Project } from '@/types';

const projectsStore = useProjectsStore();

const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref('');
const formRef = ref<FormInstance>();

const form = reactive({
  name: '',
  appKey: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  appKey: [{ required: true, message: '请输入 App Key', trigger: 'blur' }],
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN');
}

function generateAppKey(): void {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  form.appKey = `app_${random}`;
}

function openCreateDialog(): void {
  isEditing.value = false;
  editingId.value = '';
  form.name = '';
  form.appKey = '';
  dialogVisible.value = true;
}

function openEditDialog(project: Project): void {
  isEditing.value = true;
  editingId.value = project.id;
  form.name = project.name;
  form.appKey = project.appKey;
  dialogVisible.value = true;
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  try {
    if (isEditing.value) {
      await projectsStore.updateProject(editingId.value, {
        name: form.name,
        appKey: form.appKey,
      });
      ElMessage.success('项目已更新');
    } else {
      await projectsStore.createProject({
        name: form.name,
        appKey: form.appKey,
      });
      ElMessage.success('项目已创建');
    }
    dialogVisible.value = false;
  } catch {
    ElMessage.error(projectsStore.error ?? '操作失败');
  }
}

async function handleDelete(project: Project): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定要删除项目「${project.name}」吗？关联的所有事件将被删除。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
    await projectsStore.deleteProject(project.id);
    ElMessage.success('项目已删除');
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(projectsStore.error ?? '删除失败');
    }
  }
}

async function copyAppKey(appKey: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(appKey);
    ElMessage.success('App Key 已复制');
  } catch {
    ElMessage.error('复制失败');
  }
}

onMounted(() => {
  projectsStore.fetchProjects();
});
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-key-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-key {
  padding: 2px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  color: #409eff;
}
</style>
