import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Transport } from '../core/transport';
import type { MonitorEvent, ResolvedMonitorConfig } from '../types';

/** 测试用默认配置 */
const baseConfig: ResolvedMonitorConfig = {
  appKey: 'test-app',
  dsn: 'http://localhost:3000/api/ingest',
  sampleRate: 1,
  flushInterval: 60_000,
  maxBatchSize: 5,
  maxRetries: 2,
  debug: false,
  enableError: true,
  enableBreadcrumb: true,
  userId: '',
  tags: {},
  replay: { enabled: false, bufferSeconds: 30 },
  performance: { webVitals: false, longTask: false },
  privacy: { maskAllInputs: true, maskSelectors: [], blockSelectors: [] },
};

/** 构造测试事件 */
function createTestEvent(overrides: Partial<MonitorEvent> = {}): MonitorEvent {
  return {
    type: 'custom',
    payload: { message: 'test' },
    timestamp: Date.now(),
    sessionId: 'test-session',
    appKey: 'test-app',
    url: 'http://localhost/',
    userAgent: 'vitest',
    ...overrides,
  };
}

describe('Transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应将事件加入队列', () => {
    const transport = new Transport({ config: baseConfig, sessionId: 'session-1' });

    transport.enqueue(createTestEvent());
    expect(transport.getQueueLength()).toBe(1);

    transport.destroy();
  });

  it('队列达到 maxBatchSize 时应自动触发上报', async () => {
    const transport = new Transport({ config: baseConfig, sessionId: 'session-1' });

    for (let i = 0; i < baseConfig.maxBatchSize; i++) {
      transport.enqueue(createTestEvent({ payload: { index: i } }));
    }

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(transport.getQueueLength()).toBe(0);
    transport.destroy();
  });

  it('flush 应发送正确格式的批次数据', async () => {
    const transport = new Transport({ config: baseConfig, sessionId: 'session-1' });

    transport.enqueue(createTestEvent());
    await transport.flush();

    expect(fetchMock).toHaveBeenCalledWith(
      baseConfig.dsn,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': 'test-app',
        },
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.appKey).toBe('test-app');
    expect(body.sessionId).toBe('session-1');
    expect(body.events).toHaveLength(1);

    transport.destroy();
  });

  it('上报失败时应重试并在最终失败后重新入队', async () => {
    fetchMock.mockRejectedValue(new Error('网络错误'));

    const transport = new Transport({ config: { ...baseConfig, maxRetries: 1 }, sessionId: 'session-1' });

    transport.enqueue(createTestEvent());
    await transport.flush();

    // maxRetries=1 表示最多尝试 2 次（初始 + 1 次重试）
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(transport.getQueueLength()).toBe(1);

    transport.destroy();
  });

  it('destroy 后不应再接受新事件', () => {
    const transport = new Transport({ config: baseConfig, sessionId: 'session-1' });

    transport.destroy();
    transport.enqueue(createTestEvent());

    expect(transport.getQueueLength()).toBe(0);
  });
});
