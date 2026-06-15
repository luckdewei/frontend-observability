/**
 * @frontend-observability/sdk
 * 前端可观测性监控 SDK
 */

export { initMonitor, getMonitor, resetMonitor } from './core/context';
export { getOrCreateSessionId, resetSessionId } from './core/session';
export { Transport } from './core/transport';
export { createErrorPlugin } from './plugins/error';
export {
  createVueErrorHandler,
  createVuePlugin,
  installVueErrorHandler,
  type VueApp,
} from './plugins/vue';
export { createPerformancePlugin } from './plugins/performance';
export { createReplayPlugin } from './plugins/replay';
export { createBreadcrumbPlugin } from './plugins/breadcrumb';

export type {
  Breadcrumb,
  BreadcrumbCategory,
  BreadcrumbLevel,
  ErrorPayload,
  EventType,
  IngestBatch,
  Monitor,
  MonitorConfig,
  MonitorEvent,
  MonitorPlugin,
  PerformanceConfig,
  PerformancePayload,
  PrivacyConfig,
  ReplayConfig,
  ReplayPayload,
  ResolvedMonitorConfig,
} from './types';
