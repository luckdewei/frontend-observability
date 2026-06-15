import type { Monitor, MonitorPlugin } from '../types';

/**
 * Vue 应用实例类型（避免强依赖 vue 包）
 */
export interface VueApp {
  config: {
    errorHandler?: (err: unknown, instance: unknown, info: string) => void;
  };
}

/**
 * 创建 Vue 错误处理适配器
 * 将 Vue 的 errorHandler 接入监控 SDK
 *
 * @param monitor - 监控器实例
 * @returns Vue errorHandler 函数，可直接赋值给 app.config.errorHandler
 *
 * @example
 * ```ts
 * const monitor = initMonitor({ appKey: 'xxx', dsn: '...' });
 * app.config.errorHandler = createVueErrorHandler(monitor);
 * ```
 */
export function createVueErrorHandler(
  monitor: Monitor,
): (err: unknown, instance: unknown, info: string) => void {
  return (err: unknown, _instance: unknown, info: string) => {
    const error = err instanceof Error ? err : new Error(String(err));

    monitor.captureError(error, {
      type: 'VueError',
      vueInfo: info,
    });

    monitor.addBreadcrumb({
      category: 'console',
      level: 'error',
      message: `Vue 错误: ${error.message}`,
      data: { info },
    });
  };
}

/**
 * 创建 Vue 插件，自动注册 errorHandler
 */
export function createVuePlugin(monitor: Monitor): MonitorPlugin {
  return {
    name: 'vue',

    install() {
      // Vue 插件需要用户在应用初始化时手动调用 createVueErrorHandler
      // 此处仅作为占位，实际集成通过 createVueErrorHandler 完成
      monitor.addBreadcrumb({
        category: 'custom',
        level: 'info',
        message: 'Vue 错误处理适配器已就绪，请设置 app.config.errorHandler',
      });
    },
  };
}

/**
 * 便捷方法：直接为 Vue 应用安装错误处理
 *
 * @param app - Vue 应用实例
 * @param monitor - 监控器实例
 */
export function installVueErrorHandler(app: VueApp, monitor: Monitor): void {
  const previousHandler = app.config.errorHandler;

  app.config.errorHandler = (err, instance, info) => {
    createVueErrorHandler(monitor)(err, instance, info);
    previousHandler?.(err, instance, info);
  };
}
