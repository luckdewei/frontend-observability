import type { Monitor, MonitorPlugin } from '../types';

/** XHR 请求摘要 */
interface XhrSummary {
  method: string;
  url: string;
  status: number;
  duration: number;
}

/**
 * 从 URL 中提取路径摘要（去除查询参数以控制数据量）
 */
function summarizeUrl(url: string): string {
  try {
    const parsed = new URL(url, location.origin);
    return `${parsed.pathname}`;
  } catch {
    return url.split('?')[0] ?? url;
  }
}

/**
 * 获取可读的元素描述（标签名 + id/class）
 */
function describeElement(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const className =
    element.classList.length > 0 ? `.${Array.from(element.classList).slice(0, 2).join('.')}` : '';
  return `${tag}${id}${className}`;
}

/**
 * 创建面包屑采集插件
 * 自动记录点击、路由导航及 XHR 请求摘要
 */
export function createBreadcrumbPlugin(monitor: Monitor): MonitorPlugin {
  let clickHandler: ((event: MouseEvent) => void) | null = null;
  let popstateHandler: (() => void) | null = null;
  let originalPushState: typeof history.pushState | null = null;
  let originalReplaceState: typeof history.replaceState | null = null;
  let originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
  let originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null;

  return {
    name: 'breadcrumb',

    install() {
      // 点击事件
      clickHandler = (event: MouseEvent) => {
        const target = event.target as Element | null;
        if (!target) {
          return;
        }

        monitor.addBreadcrumb({
          category: 'click',
          level: 'info',
          message: `点击 ${describeElement(target)}`,
          data: {
            x: event.clientX,
            y: event.clientY,
          },
        });
      };

      document.addEventListener('click', clickHandler, true);

      // SPA 路由导航（pushState / replaceState）
      const recordNavigation = (type: string) => {
        monitor.addBreadcrumb({
          category: 'navigation',
          level: 'info',
          message: `${type}: ${location.pathname}`,
          data: { url: location.href },
        });
      };

      originalPushState = history.pushState.bind(history);
      originalReplaceState = history.replaceState.bind(history);

      history.pushState = function (...args) {
        originalPushState!(...args);
        recordNavigation('pushState');
      };

      history.replaceState = function (...args) {
        originalReplaceState!(...args);
        recordNavigation('replaceState');
      };

      popstateHandler = () => recordNavigation('popstate');
      window.addEventListener('popstate', popstateHandler);

      // XHR 请求摘要
      originalXhrOpen = XMLHttpRequest.prototype.open;
      originalXhrSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null,
      ) {
        (this as XMLHttpRequest & { __monitor__?: Partial<XhrSummary> }).__monitor__ = {
          method: method.toUpperCase(),
          url: typeof url === 'string' ? url : url.toString(),
        };

        return originalXhrOpen!.call(this, method, url, async ?? true, username, password);
      };

      XMLHttpRequest.prototype.send = function (...args) {
        const meta = (this as XMLHttpRequest & { __monitor__?: Partial<XhrSummary> }).__monitor__;
        const startTime = performance.now();

        this.addEventListener('loadend', () => {
          if (!meta?.method || !meta?.url) {
            return;
          }

          const summary: XhrSummary = {
            method: meta.method,
            url: summarizeUrl(meta.url),
            status: this.status,
            duration: Math.round(performance.now() - startTime),
          };

          monitor.addBreadcrumb({
            category: 'xhr',
            level: this.status >= 400 ? 'error' : 'info',
            message: `${summary.method} ${summary.url} → ${summary.status}`,
            data: { ...summary },
          });
        });

        return originalXhrSend!.call(this, ...args);
      };
    },

    destroy() {
      if (clickHandler) {
        document.removeEventListener('click', clickHandler, true);
      }

      if (popstateHandler) {
        window.removeEventListener('popstate', popstateHandler);
      }

      if (originalPushState) {
        history.pushState = originalPushState;
      }

      if (originalReplaceState) {
        history.replaceState = originalReplaceState;
      }

      if (originalXhrOpen) {
        XMLHttpRequest.prototype.open = originalXhrOpen;
      }

      if (originalXhrSend) {
        XMLHttpRequest.prototype.send = originalXhrSend;
      }
    },
  };
}
