import { defineStore } from 'pinia';
import { ref } from 'vue';
import client from '@/api/client';
import type {
  BreadcrumbPayload,
  EventType,
  MonitorEvent,
  PaginatedResponse,
} from '@/types';

export interface EventFilters {
  projectId?: string;
  sessionId?: string;
  page?: number;
  pageSize?: number;
}

export const useEventsStore = defineStore('events', () => {
  const events = ref<MonitorEvent[]>([]);
  const currentEvent = ref<MonitorEvent | null>(null);
  const breadcrumbs = ref<BreadcrumbPayload[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const totalPages = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchEvents(type: EventType, filters: EventFilters = {}) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await client.get<PaginatedResponse<MonitorEvent>>('/events', {
        params: {
          type,
          projectId: filters.projectId || undefined,
          sessionId: filters.sessionId || undefined,
          page: filters.page ?? page.value,
          pageSize: filters.pageSize ?? pageSize.value,
        },
      });

      events.value = data.items;
      total.value = data.total;
      page.value = data.page;
      pageSize.value = data.pageSize;
      totalPages.value = data.totalPages;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载事件失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEventById(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await client.get<MonitorEvent>(`/events/${id}`);
      currentEvent.value = data;

      if (data.sessionId) {
        await fetchBreadcrumbs(data.sessionId);
      } else {
        breadcrumbs.value = [];
      }

      return data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载事件详情失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchBreadcrumbs(sessionId: string) {
    try {
      const { data } = await client.get<PaginatedResponse<MonitorEvent>>('/events', {
        params: {
          sessionId,
          page: 1,
          pageSize: 100,
        },
      });

      breadcrumbs.value = data.items
        .filter((item) => {
          const payload = item.payload as Record<string, unknown>;
          return typeof payload.category === 'string';
        })
        .map((item) => item.payload as unknown as BreadcrumbPayload)
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    } catch {
      breadcrumbs.value = [];
    }
  }

  async function fetchPerformanceEvents(projectId?: string, hours = 24) {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await client.get<PaginatedResponse<MonitorEvent>>('/events', {
        params: {
          type: 'PERFORMANCE',
          projectId: projectId || undefined,
          page: 1,
          pageSize: 500,
        },
      });

      const since = Date.now() - hours * 60 * 60 * 1000;
      return data.items.filter((item) => new Date(item.createdAt).getTime() >= since);
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载性能数据失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    events.value = [];
    currentEvent.value = null;
    breadcrumbs.value = [];
    total.value = 0;
    page.value = 1;
    error.value = null;
  }

  return {
    events,
    currentEvent,
    breadcrumbs,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    fetchEvents,
    fetchEventById,
    fetchBreadcrumbs,
    fetchPerformanceEvents,
    reset,
  };
});
