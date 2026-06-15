import { getOrCreateSessionId } from './session';
import { Transport } from './transport';
import { createErrorPlugin } from '../plugins/error';
import { createBreadcrumbPlugin } from '../plugins/breadcrumb';
import { createPerformancePlugin } from '../plugins/performance';
import { createReplayPlugin } from '../plugins/replay';
import type {
  Breadcrumb,
  EventType,
  Monitor,
  MonitorConfig,
  MonitorEvent,
  MonitorPlugin,
  ResolvedMonitorConfig,
} from '../types';

/** 默认配置值 */
const DEFAULT_CONFIG: ResolvedMonitorConfig = {
  appKey: '',
  dsn: '',
  sampleRate: 1,
  flushInterval: 5_000,
  maxBatchSize: 20,
  maxRetries: 3,
  debug: false,
  enableError: true,
  enableBreadcrumb: true,
  userId: '',
  tags: {},
  replay: {
    enabled: false,
    bufferSeconds: 30,
  },
  performance: {
    webVitals: true,
    longTask: true,
  },
  privacy: {
    maskAllInputs: true,
    maskSelectors: [],
    blockSelectors: [],
  },
};

/**
 * 合并用户配置与默认配置
 */
function resolveConfig(config: MonitorConfig): ResolvedMonitorConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    replay: { ...DEFAULT_CONFIG.replay, ...config.replay },
    performance: { ...DEFAULT_CONFIG.performance, ...config.performance },
    privacy: { ...DEFAULT_CONFIG.privacy, ...config.privacy },
    tags: { ...DEFAULT_CONFIG.tags, ...config.tags },
  };
}

/**
 * 判断当前事件是否命中采样
 */
function shouldSample(sampleRate: number): boolean {
  return Math.random() <= sampleRate;
}

/**
 * 监控器实现类
 */
class MonitorImpl implements Monitor {
  private readonly config: ResolvedMonitorConfig;
  private readonly sessionId: string;
  private readonly transport: Transport;
  private readonly plugins: MonitorPlugin[] = [];
  private readonly breadcrumbs: Breadcrumb[] = [];
  private readonly maxBreadcrumbs = 50;
  private destroyed = false;

  /** 回放插件引用，用于错误触发时获取回放数据 */
  replayPlugin: ReturnType<typeof createReplayPlugin> | null = null;

  constructor(config: MonitorConfig) {
    this.config = resolveConfig(config);
    this.sessionId = getOrCreateSessionId();

    this.transport = new Transport({
      config: this.config,
      sessionId: this.sessionId,
      onDebug: this.config.debug ? (msg, data) => console.debug(`[Monitor] ${msg}`, data) : undefined,
    });

    this.installPlugins();
  }

  /**
   * 获取当前配置
   */
  getConfig(): Readonly<ResolvedMonitorConfig> {
    return this.config;
  }

  /**
   * 获取会话 ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * 捕获并上报事件
   */
  captureEvent(type: EventType, payload: MonitorEvent['payload']): void {
    if (this.destroyed || !shouldSample(this.config.sampleRate)) {
      return;
    }

    const event: MonitorEvent = {
      type,
      payload,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      appKey: this.config.appKey,
      url: typeof location !== 'undefined' ? location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    this.transport.enqueue(event);
  }

  /**
   * 捕获错误事件
   */
  captureError(error: Error | string, extra?: Record<string, unknown>): void {
    const err = typeof error === 'string' ? new Error(error) : error;

    this.captureEvent('error', {
      message: err.message,
      stack: err.stack,
      type: err.name,
      ...extra,
    });

    // 错误发生时自动触发回放上报
    this.flushReplay('error');
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const entry: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(entry);

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    if (this.config.enableBreadcrumb) {
      this.captureEvent('breadcrumb', entry);
    }
  }

  /**
   * 获取当前面包屑列表
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * 手动触发回放数据上报
   */
  flushReplay(trigger: 'error' | 'manual' = 'manual'): void {
    if (this.replayPlugin) {
      this.replayPlugin.flush(trigger);
    }
  }

  /**
   * 立即刷新上报队列
   */
  async flush(): Promise<void> {
    await this.transport.flush();
  }

  /**
   * 销毁监控实例
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    for (const plugin of this.plugins) {
      plugin.destroy?.();
    }

    this.transport.destroy();
    monitorInstance = null;
  }

  /**
   * 安装各功能插件
   */
  private installPlugins(): void {
    if (this.config.enableBreadcrumb) {
      this.plugins.push(createBreadcrumbPlugin(this));
    }

    if (this.config.enableError) {
      this.plugins.push(createErrorPlugin(this));
    }

    if (this.config.performance.webVitals || this.config.performance.longTask) {
      this.plugins.push(createPerformancePlugin(this));
    }

    if (this.config.replay.enabled) {
      this.replayPlugin = createReplayPlugin(this);
      this.plugins.push(this.replayPlugin);
    }

    for (const plugin of this.plugins) {
      plugin.install(this);
    }
  }
}

/** 全局单例实例 */
let monitorInstance: MonitorImpl | null = null;

/**
 * 初始化监控 SDK
 * @param config - 监控配置
 * @returns 监控器实例
 */
export function initMonitor(config: MonitorConfig): Monitor {
  if (monitorInstance) {
    monitorInstance.destroy();
  }

  monitorInstance = new MonitorImpl(config);
  return monitorInstance;
}

/**
 * 获取已初始化的监控器实例
 * @throws 若尚未调用 initMonitor 则抛出错误
 */
export function getMonitor(): Monitor {
  if (!monitorInstance) {
    throw new Error('[Monitor] 请先调用 initMonitor() 初始化监控 SDK');
  }

  return monitorInstance;
}

/**
 * 重置单例（仅用于测试）
 */
export function resetMonitor(): void {
  monitorInstance?.destroy();
  monitorInstance = null;
}

export { resolveConfig, shouldSample };
