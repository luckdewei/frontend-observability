import { expect, test } from '@playwright/test';

const SERVER_URL = 'http://localhost:3000';

test.describe('监控 SDK 端到端流程', () => {
  test('加载 Demo 并触发错误后，ingest 接口应收到 error 事件', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '前端可观测性 Demo' })).toBeVisible();

    const ingestResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/ingest') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    );

    await page.getByTestId('throw-error').click();

    await page.evaluate(async () => {
      const monitor = (window as Window & { __monitor?: { flush: () => Promise<void> } }).__monitor;
      await monitor?.flush();
    });

    const ingestResponse = await ingestResponsePromise;
    const requestBody = ingestResponse.request().postDataJSON() as {
      appKey: string;
      events: Array<{ type: string; payload: { message?: string } }>;
    };

    expect(requestBody.appKey).toBe('demo-app-key');
    expect(
      requestBody.events.some(
        (event) =>
          event.type === 'error' &&
          event.payload.message?.includes('主动抛出的 JS 错误'),
      ),
    ).toBeTruthy();
  });

  test('触发错误后，事件查询 API 可查到 ERROR 类型记录', async ({ page, request }) => {
    const uniqueMessage = `E2E-${Date.now()}`;

    await page.goto('/');
    await page.evaluate((message) => {
      const monitor = (window as Window & {
        __monitor?: { captureError: (error: Error) => void };
      }).__monitor;
      monitor?.captureError(new Error(message));
    }, uniqueMessage);

    await page.evaluate(async () => {
      const monitor = (window as Window & { __monitor?: { flush: () => Promise<void> } }).__monitor;
      await monitor?.flush();
    });

    await expect
      .poll(
        async () => {
          const response = await request.get(`${SERVER_URL}/api/events`, {
            params: { type: 'ERROR', pageSize: '20' },
          });
          expect(response.ok()).toBeTruthy();

          const body = (await response.json()) as {
            items: Array<{ payload: { message?: string } }>;
          };

          return body.items.some((item) => item.payload.message?.includes(uniqueMessage));
        },
        { timeout: 15_000 },
      )
      .toBeTruthy();
  });

  test('路由跳转与慢请求按钮可正常交互', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('nav-about').click();
    await expect(page.getByText('当前路由：/about')).toBeVisible();

    await page.getByTestId('slow-request').click();
    await expect(page.getByTestId('slow-request')).toBeEnabled();
  });
});
