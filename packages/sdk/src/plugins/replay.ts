import { record, type eventWithTime } from 'rrweb';
import type { Monitor, MonitorPlugin } from '../types';

/**
 * 环形缓冲区，按时间窗口保留 rrweb 事件
 */
class CircularReplayBuffer {
  private events: eventWithTime[] = [];
  private readonly maxDurationMs: number;

  constructor(bufferSeconds: number) {
    this.maxDurationMs = bufferSeconds * 1000;
  }

  /**
   * 推入新事件并淘汰超出时间窗口的旧事件
   */
  push(event: eventWithTime): void {
    this.events.push(event);
    this.trim();
  }

  /**
   * 获取当前缓冲区内的所有事件快照
   */
  snapshot(): eventWithTime[] {
    this.trim();
    return [...this.events];
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.events = [];
  }

  /**
   * 移除超出时间窗口的事件
   */
  private trim(): void {
    if (this.events.length === 0) {
      return;
    }

    const latestTimestamp = this.events[this.events.length - 1].timestamp;
    const cutoff = latestTimestamp - this.maxDurationMs;

    while (this.events.length > 0 && this.events[0].timestamp < cutoff) {
      this.events.shift();
    }
  }
}

/**
 * 创建会话回放插件
 * 使用 rrweb 录制用户操作，维护环形缓冲区，在错误发生时上报
 */
export function createReplayPlugin(monitor: Monitor) {
  let stopRecord: (() => void) | null = null;
  let buffer: CircularReplayBuffer | null = null;

  const plugin: MonitorPlugin & { flush: (trigger: 'error' | 'manual') => void } = {
    name: 'replay',

    install() {
      const config = monitor.getConfig();

      if (!config.replay.enabled) {
        return;
      }

      buffer = new CircularReplayBuffer(config.replay.bufferSeconds ?? 30);

      const privacy = config.privacy;
      const maskTextSelector = privacy.maskAllInputs
        ? 'input, textarea, select, [contenteditable]'
        : (privacy.maskSelectors ?? []).join(', ');

      const stopFn = record({
        emit(event) {
          buffer?.push(event);
        },
        maskTextSelector: maskTextSelector || undefined,
        blockSelector:
          (privacy.blockSelectors ?? []).length > 0
            ? (privacy.blockSelectors ?? []).join(', ')
            : undefined,
        maskAllInputs: privacy.maskAllInputs,
      });

      stopRecord = stopFn ?? null;
    },

    /**
     * 将缓冲区内的回放数据上报
     */
    flush(trigger: 'error' | 'manual') {
      if (!buffer) {
        return;
      }

      const events = buffer.snapshot();

      if (events.length === 0) {
        return;
      }

      monitor.captureEvent('replay', {
        events,
        trigger,
      });

      if (trigger === 'error') {
        // 错误触发上报后保留缓冲区，继续录制
        buffer.clear();
      }
    },

    destroy() {
      stopRecord?.();
      stopRecord = null;
      buffer = null;
    },
  };

  return plugin;
}
