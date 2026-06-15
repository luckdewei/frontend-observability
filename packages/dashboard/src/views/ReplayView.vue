<template>
  <div v-loading="loading" class="replay-view">
    <el-page-header @back="goBack">
      <template #content>
        <span class="page-title">会话回放</span>
      </template>
    </el-page-header>

    <el-card v-if="event" shadow="never" class="info-card">
      <el-descriptions :column="4" size="small">
        <el-descriptions-item label="项目">
          {{ event.project?.name ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="会话 ID">
          {{ event.sessionId ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="触发方式">
          {{ triggerLabel }}
        </el-descriptions-item>
        <el-descriptions-item label="记录时间">
          {{ formatTime(event.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="player-card">
      <div ref="playerContainer" class="player-container" />
      <el-empty v-if="!loading && !hasEvents" description="无回放数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import client from '@/api/client';
import type { MonitorEvent, ReplayPayload } from '@/types';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const event = ref<MonitorEvent | null>(null);
const playerContainer = ref<HTMLDivElement | null>(null);
const hasEvents = ref(false);

const triggerLabel = computed(() => {
  const payload = event.value?.payload as ReplayPayload | undefined;
  if (payload?.trigger === 'error') return '错误触发';
  if (payload?.trigger === 'manual') return '手动触发';
  return '-';
});

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN');
}

function goBack() {
  router.back();
}

function initPlayer(events: unknown[]) {
  if (!playerContainer.value || events.length === 0) {
    hasEvents.value = false;
    return;
  }

  hasEvents.value = true;
  playerContainer.value.innerHTML = '';

  new rrwebPlayer({
    target: playerContainer.value,
    props: {
      events: events as ConstructorParameters<typeof rrwebPlayer>[0]['props']['events'],
      width: playerContainer.value.clientWidth || 1024,
      height: 600,
      autoPlay: false,
      showController: true,
      speedOption: [1, 2, 4, 8],
    },
  });
}

onMounted(async () => {
  const id = route.params.id as string;

  try {
    const { data } = await client.get<MonitorEvent>(`/events/${id}`);
    event.value = data;

    if (data.type !== 'REPLAY') {
      ElMessage.warning('该事件不是回放类型');
      return;
    }

    const payload = data.payload as unknown as ReplayPayload;
    const events = payload.events ?? [];

    if (events.length === 0) {
      ElMessage.warning('回放数据为空');
      return;
    }

    initPlayer(events);
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载回放失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.replay-view {
  min-height: 500px;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
}

.info-card {
  margin: 16px 0;
}

.player-card {
  min-height: 640px;
}

.player-container {
  width: 100%;
  min-height: 600px;
  display: flex;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 6px;
  overflow: hidden;
}

.player-container :deep(.rr-player) {
  margin: 0 auto;
}
</style>
