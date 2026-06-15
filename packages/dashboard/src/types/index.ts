export type EventType = 'ERROR' | 'PERFORMANCE' | 'REPLAY';

export interface Project {
  id: string;
  name: string;
  appKey: string;
  createdAt: string;
  updatedAt: string;
  _count?: { events: number };
}

export interface MonitorEvent {
  id: string;
  projectId: string;
  type: EventType;
  payload: Record<string, unknown>;
  sessionId: string | null;
  userId: string | null;
  url: string | null;
  userAgent: string | null;
  createdAt: string;
  project?: { id: string; name: string; appKey?: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorPayload {
  message?: string;
  stack?: string;
  type?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  tagName?: string;
  resourceUrl?: string;
}

export interface BreadcrumbPayload {
  category: string;
  level: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: number;
}

export interface PerformancePayload {
  name: string;
  value: number;
  rating?: string;
}

export interface ReplayPayload {
  events: unknown[];
  trigger: string;
}

export interface PercentileMetrics {
  p50: number;
  p75: number;
  p95: number;
}

export interface WebVitalsSummary {
  LCP: PercentileMetrics;
  INP: PercentileMetrics;
  CLS: PercentileMetrics;
}
