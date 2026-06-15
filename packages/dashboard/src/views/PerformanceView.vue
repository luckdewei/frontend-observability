<template>
  <div class="performance-view">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true">
        <el-form-item label="项目">
          <el-select
            v-model="selectedProjectId"
            placeholder="全部项目"
            clearable
            style="width: 200px"
            @change="loadData"
          >
            <el-option
              v-for="project in projectsStore.projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="hours" style="width: 140px" @change="loadData">
            <el-option label="最近 1 小时" :value="1" />
            <el-option label="最近 6 小时" :value="6" />
            <el-option label="最近 24 小时" :value="24" />
            <el-option label="最近 7 天" :value="168" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" v-loading="loading">
      <el-col v-for="metric in chartConfigs" :key="metric.name" :span="8">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>{{ metric.label }}</span>
              <el-tag size="small">{{ metric.unit }}</el-tag>
            </div>
          </template>
          <v-chart class="chart" :option="metric.option" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="summary-card">
      <template #header>
        <span>指标摘要</span>
      </template>
      <el-table :data="summaryTable" stripe>
        <el-table-column prop="metric" label="指标" width="120" />
        <el-table-column prop="p50" label="P50" />
        <el-table-column prop="p75" label="P75" />
        <el-table-column prop="p95" label="P95" />
        <el-table-column prop="count" label="样本数" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { ElMessage } from 'element-plus';
import { useEventsStore } from '@/stores/events';
import { useProjectsStore } from '@/stores/projects';
import type { MonitorEvent, PercentileMetrics, PerformancePayload, WebVitalsSummary } from '@/types';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, TitleComponent]);

const eventsStore = useEventsStore();
const projectsStore = useProjectsStore();

const selectedProjectId = ref('');
const hours = ref(24);
const loading = ref(false);
const summary = ref<WebVitalsSummary>({
  LCP: { p50: 0, p75: 0, p95: 0 },
  INP: { p50: 0, p75: 0, p95: 0 },
  CLS: { p50: 0, p75: 0, p95: 0 },
});
const sampleCounts = ref({ LCP: 0, INP: 0, CLS: 0 });

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function computePercentiles(values: number[]): PercentileMetrics {
  return {
    p50: percentile(values, 50),
    p75: percentile(values, 75),
    p95: percentile(values, 95),
  };
}

function extractMetrics(events: MonitorEvent[]): WebVitalsSummary {
  const groups: Record<string, number[]> = { LCP: [], INP: [], CLS: [] };

  for (const event of events) {
    const payload = event.payload as unknown as PerformancePayload;
    if (payload.name && groups[payload.name]) {
      groups[payload.name].push(payload.value);
    }
  }

  sampleCounts.value = {
    LCP: groups.LCP.length,
    INP: groups.INP.length,
    CLS: groups.CLS.length,
  };

  return {
    LCP: computePercentiles(groups.LCP),
    INP: computePercentiles(groups.INP),
    CLS: computePercentiles(groups.CLS),
  };
}

function buildChartOption(label: string, metrics: PercentileMetrics, unit: string, decimals: number) {
  const format = (v: number) => (decimals === 0 ? Math.round(v).toString() : v.toFixed(decimals));

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: { name: string; value: number }[]) => {
        const item = params[0];
        return `${item.name}: ${format(item.value)} ${unit}`;
      },
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['P50', 'P75', 'P95'],
    },
    yAxis: {
      type: 'value',
      name: unit,
    },
    series: [
      {
        name: label,
        type: 'bar',
        data: [metrics.p50, metrics.p75, metrics.p95],
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const colors = ['#67c23a', '#e6a23c', '#f56c6c'];
            return colors[params.dataIndex];
          },
        },
        label: {
          show: true,
          position: 'top',
          formatter: (params: { value: number }) => format(params.value),
        },
      },
    ],
  };
}

const chartConfigs = computed(() => [
  {
    name: 'LCP',
    label: '最大内容绘制 (LCP)',
    unit: 'ms',
    option: buildChartOption('LCP', summary.value.LCP, 'ms', 0),
  },
  {
    name: 'INP',
    label: '交互到下次绘制 (INP)',
    unit: 'ms',
    option: buildChartOption('INP', summary.value.INP, 'ms', 0),
  },
  {
    name: 'CLS',
    label: '累积布局偏移 (CLS)',
    unit: 'score',
    option: buildChartOption('CLS', summary.value.CLS, '', 3),
  },
]);

const summaryTable = computed(() => [
  {
    metric: 'LCP',
    p50: `${Math.round(summary.value.LCP.p50)} ms`,
    p75: `${Math.round(summary.value.LCP.p75)} ms`,
    p95: `${Math.round(summary.value.LCP.p95)} ms`,
    count: sampleCounts.value.LCP,
  },
  {
    metric: 'INP',
    p50: `${Math.round(summary.value.INP.p50)} ms`,
    p75: `${Math.round(summary.value.INP.p75)} ms`,
    p95: `${Math.round(summary.value.INP.p95)} ms`,
    count: sampleCounts.value.INP,
  },
  {
    metric: 'CLS',
    p50: summary.value.CLS.p50.toFixed(3),
    p75: summary.value.CLS.p75.toFixed(3),
    p95: summary.value.CLS.p95.toFixed(3),
    count: sampleCounts.value.CLS,
  },
]);

async function loadData() {
  loading.value = true;
  try {
    const events = await eventsStore.fetchPerformanceEvents(
      selectedProjectId.value || undefined,
      hours.value,
    );
    summary.value = extractMetrics(events);
  } catch {
    ElMessage.error(eventsStore.error ?? '加载性能数据失败');
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await projectsStore.fetchProjects();
  await loadData();
});
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.chart-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart {
  height: 280px;
}

.summary-card {
  margin-top: 8px;
}
</style>
