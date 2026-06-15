import type { IngestBatch, MonitorEvent, ResolvedMonitorConfig } from '../types';

/** 默认上报超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * 传输层选项
 */
export interface TransportOptions {
  config: ResolvedMonitorConfig;
  sessionId: string;
  onDebug?: (message: string, data?: unknown) => void;
}

/**
 * 负责事件批量队列、重试与 sendBeacon 降级的传输层
 */
export class Transport {
  private readonly config: ResolvedMonitorConfig;
  private readonly sessionId: string;
  private readonly onDebug?: (message: string, data?: unknown) => void;

  private queue: MonitorEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;
  private isFlushing = false;

  constructor(options: TransportOptions) {
    this.config = options.config;
    this.sessionId = options.sessionId;
    this.onDebug = options.onDebug;

    this.startFlushTimer();
    this.bindPageUnload();
  }

  /**
   * 将事件加入上报队列
   */
  enqueue(event: MonitorEvent): void {
    if (this.isDestroyed) {
      return;
    }

    this.queue.push(event);

    if (this.queue.length >= this.config.maxBatchSize) {
      void this.flush();
    }
  }

  /**
   * 立即刷新队列并上报
   */
  async flush(): Promise<void> {
    if (this.isDestroyed || this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const events = this.queue.splice(0, this.config.maxBatchSize);

    const batch: IngestBatch = {
      appKey: this.config.appKey,
      sessionId: this.sessionId,
      events,
      sentAt: Date.now(),
    };

    try {
      await this.sendWithRetry(batch);
      this.onDebug?.('批次上报成功', { count: events.length });

      if (this.queue.length > 0) {
        void this.flush();
      }
    } catch (error) {
      // 上报失败时将事件放回队列头部，等待下次定时刷新重试
      this.queue.unshift(...events);
      this.onDebug?.('批次上报失败，已重新入队', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * 销毁传输层，清理定时器
   */
  destroy(): void {
    this.isDestroyed = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.unbindPageUnload();
  }

  /**
   * 获取当前队列长度（用于测试）
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  /**
   * 绑定页面卸载时的 sendBeacon 上报
   */
  private bindPageUnload(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const handler = () => {
      this.flushWithBeacon();
    };

    window.addEventListener('pagehide', handler);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handler();
      }
    });

    this.pageUnloadHandler = handler;
  }

  private pageUnloadHandler: (() => void) | null = null;

  /**
   * 解绑页面卸载监听
   */
  private unbindPageUnload(): void {
    if (typeof window === 'undefined' || !this.pageUnloadHandler) {
      return;
    }

    window.removeEventListener('pagehide', this.pageUnloadHandler);
    this.pageUnloadHandler = null;
  }

  /**
   * 使用 sendBeacon 在页面卸载时上报剩余事件
   */
  private flushWithBeacon(): void {
    if (this.queue.length === 0 || typeof navigator === 'undefined') {
      return;
    }

    const batch: IngestBatch = {
      appKey: this.config.appKey,
      sessionId: this.sessionId,
      events: this.queue.splice(0),
      sentAt: Date.now(),
    };

    const body = JSON.stringify(batch);
    const sent = navigator.sendBeacon?.(this.config.dsn, new Blob([body], { type: 'application/json' }));

    if (sent) {
      this.onDebug?.('sendBeacon 上报成功', { count: batch.events.length });
    } else {
      // sendBeacon 失败时尝试同步 fetch（keepalive）
      void this.sendFetch(batch, true);
    }
  }

  /**
   * 带重试的上报
   */
  private async sendWithRetry(batch: IngestBatch): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        await this.sendFetch(batch);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < this.config.maxRetries) {
          await this.delay(attempt * 500);
        }
      }
    }

    throw lastError;
  }

  /**
   * 通过 fetch 发送批次数据
   */
  private async sendFetch(batch: IngestBatch, keepalive = false): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(this.config.dsn, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': this.config.appKey,
        },
        body: JSON.stringify(batch),
        keepalive,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`上报失败: HTTP ${response.status}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
