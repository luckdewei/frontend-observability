/**
 * 监控事件类型枚举
 */
export type EventType =
  | 'error'
  | 'performance'
  | 'breadcrumb'
  | 'replay'
  | 'custom';

/**
 * 面包屑分类
 */
export type BreadcrumbCategory = 'click' | 'navigation' | 'xhr' | 'console' | 'custom';

/**
 * 面包屑级别
 */
export type BreadcrumbLevel = 'info' | 'warning' | 'error';

/**
 * 面包屑记录
 */
export interface Breadcrumb {
  /** 分类 */
  category: BreadcrumbCategory;
  /** 级别 */
  level: BreadcrumbLevel;
  /** 消息摘要 */
  message: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
  /** 时间戳（毫秒） */
  timestamp: number;
}

/**
 * 会话回放配置
 */
export interface ReplayConfig {
  /** 是否启用回放 */
  enabled?: boolean;
  /** 环形缓冲区保留秒数 */
  bufferSeconds?: number;
}

/**
 * 性能监控配置
 */
export interface PerformanceConfig {
  /** 是否采集 Web Vitals（LCP、INP、CLS） */
  webVitals?: boolean;
  /** 是否采集长任务 */
  longTask?: boolean;
}

/**
 * 隐私配置
 */
export interface PrivacyConfig {
  /** 是否遮蔽所有输入框 */
  maskAllInputs?: boolean;
  /** 需要遮蔽的 CSS 选择器列表 */
  maskSelectors?: string[];
  /** 需要屏蔽的元素选择器列表 */
  blockSelectors?: string[];
}

/**
 * 监控 SDK 初始化配置
 */
export interface MonitorConfig {
  /** 应用标识 */
  appKey: string;
  /** 数据上报地址 */
  dsn: string;
  /** 采样率，0~1 */
  sampleRate?: number;
  /** 批量上报间隔（毫秒） */
  flushInterval?: number;
  /** 单次批量最大事件数 */
  maxBatchSize?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
  /** 会话回放配置 */
  replay?: ReplayConfig;
  /** 性能监控配置 */
  performance?: PerformanceConfig;
  /** 隐私配置 */
  privacy?: PrivacyConfig;
  /** 是否启用错误采集 */
  enableError?: boolean;
  /** 是否启用面包屑 */
  enableBreadcrumb?: boolean;
  /** 自定义用户标识 */
  userId?: string;
  /** 自定义标签 */
  tags?: Record<string, string>;
}

/**
 * 错误事件载荷
 */
export interface ErrorPayload {
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 错误类型 */
  type?: string;
  /** 发生错误的文件名 */
  filename?: string;
  /** 行号 */
  lineno?: number;
  /** 列号 */
  colno?: number;
  /** 资源加载错误时的标签名 */
  tagName?: string;
  /** 资源 URL */
  resourceUrl?: string;
}

/**
 * 性能事件载荷
 */
export interface PerformancePayload {
  /** 指标名称 */
  name: string;
  /** 指标值 */
  value: number;
  /** 评级（web-vitals 提供） */
  rating?: string;
  /** 指标 ID */
  id?: string;
  /** 附加信息 */
  detail?: Record<string, unknown>;
}

/**
 * 回放事件载荷
 */
export interface ReplayPayload {
  /** rrweb 事件列表 */
  events: unknown[];
  /** 触发原因 */
  trigger: 'error' | 'manual';
}

/**
 * 监控事件
 */
export interface MonitorEvent {
  /** 事件类型 */
  type: EventType;
  /** 事件载荷 */
  payload: ErrorPayload | PerformancePayload | Breadcrumb | ReplayPayload | Record<string, unknown>;
  /** 时间戳（毫秒） */
  timestamp: number;
  /** 会话 ID */
  sessionId: string;
  /** 应用标识 */
  appKey: string;
  /** 页面 URL */
  url: string;
  /** 用户代理 */
  userAgent: string;
}

/**
 * 上报批次
 */
export interface IngestBatch {
  /** 应用标识 */
  appKey: string;
  /** 会话 ID */
  sessionId: string;
  /** 事件列表 */
  events: MonitorEvent[];
  /** 发送时间戳 */
  sentAt: number;
}

/**
 * 插件接口
 */
export interface MonitorPlugin {
  /** 插件名称 */
  name: string;
  /** 安装插件 */
  install(monitor: Monitor): void;
  /** 卸载插件 */
  destroy?(): void;
}

/**
 * 监控器公开 API
 */
export interface Monitor {
  /** 获取当前配置 */
  getConfig(): Readonly<Required<MonitorConfig>>;
  /** 获取会话 ID */
  getSessionId(): string;
  /** 捕获自定义事件 */
  captureEvent(type: EventType, payload: MonitorEvent['payload']): void;
  /** 捕获错误 */
  captureError(error: Error | string, extra?: Record<string, unknown>): void;
  /** 添加面包屑 */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void;
  /** 获取面包屑列表 */
  getBreadcrumbs(): Breadcrumb[];
  /** 手动触发回放上报 */
  flushReplay(trigger?: 'error' | 'manual'): void;
  /** 立即刷新上报队列 */
  flush(): Promise<void>;
  /** 销毁监控实例 */
  destroy(): void;
}

/**
 * 内部使用的完整配置（含默认值）
 */
export type ResolvedMonitorConfig = Required<
  Omit<MonitorConfig, 'replay' | 'performance' | 'privacy' | 'tags'>
> & {
  replay: Required<ReplayConfig>;
  performance: Required<PerformanceConfig>;
  privacy: Required<PrivacyConfig>;
  tags: Record<string, string>;
};
