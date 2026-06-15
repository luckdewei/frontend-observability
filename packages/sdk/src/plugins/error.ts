import type { Monitor, MonitorPlugin } from '../types';

/**
 * 判断是否为脚本错误（跨域脚本无法获取堆栈）
 */
function isScriptError(message: string): boolean {
  return message === 'Script error.' || message === 'Script error';
}

/**
 * 创建错误采集插件
 * 监听 window.onerror、unhandledrejection 及资源加载错误
 */
export function createErrorPlugin(monitor: Monitor): MonitorPlugin {
  let onErrorHandler: OnErrorEventHandler | null = null;
  let onRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  let onResourceErrorHandler: ((event: Event) => void) | null = null;

  return {
    name: 'error',

    install() {
      // 全局 JS 运行时错误
      onErrorHandler = (message, source, lineno, colno, error) => {
        const msg = typeof message === 'string' ? message : '未知错误';

        if (isScriptError(msg)) {
          monitor.captureError(new Error(msg), {
            type: 'ScriptError',
            filename: source,
            lineno,
            colno,
          });
          return false;
        }

        monitor.captureError(error ?? new Error(msg), {
          type: 'RuntimeError',
          filename: source,
          lineno,
          colno,
        });

        return false;
      };

      window.onerror = onErrorHandler;

      // 未处理的 Promise 拒绝
      onRejectionHandler = (event: PromiseRejectionEvent) => {
        const reason = event.reason;
        const error = reason instanceof Error ? reason : new Error(String(reason));

        monitor.captureError(error, {
          type: 'UnhandledRejection',
        });
      };

      window.addEventListener('unhandledrejection', onRejectionHandler);

      // 资源加载错误（img、script、link 等）
      onResourceErrorHandler = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (!target || target === (window as unknown as HTMLElement)) {
          return;
        }

        const tagName = target.tagName?.toLowerCase();
        const resourceUrl =
          (target as HTMLImageElement).src ||
          (target as HTMLScriptElement).src ||
          (target as HTMLLinkElement).href ||
          '';

        monitor.captureEvent('error', {
          message: `资源加载失败: ${tagName}`,
          type: 'ResourceError',
          tagName,
          resourceUrl,
        });
      };

      window.addEventListener('error', onResourceErrorHandler, true);
    },

    destroy() {
      if (onErrorHandler && window.onerror === onErrorHandler) {
        window.onerror = null;
      }

      if (onRejectionHandler) {
        window.removeEventListener('unhandledrejection', onRejectionHandler);
      }

      if (onResourceErrorHandler) {
        window.removeEventListener('error', onResourceErrorHandler, true);
      }
    },
  };
}
