import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import type { Monitor, MonitorPlugin } from '../types';

/**
 * 将 web-vitals 指标转换为监控事件并上报
 */
function reportWebVital(monitor: Monitor, metric: Metric): void {
  monitor.captureEvent('performance', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    detail: {
      navigationType: metric.navigationType,
      entries: metric.entries?.map((entry) => ({
        name: entry.name,
        startTime: entry.startTime,
        duration: 'duration' in entry ? (entry as PerformanceEntry).duration : undefined,
      })),
    },
  });
}

/**
 * 创建性能监控插件
 * 采集 Web Vitals（LCP、INP、CLS）及长任务
 */
export function createPerformancePlugin(monitor: Monitor): MonitorPlugin {
  let longTaskObserver: PerformanceObserver | null = null;

  return {
    name: 'performance',

    install() {
      const config = monitor.getConfig().performance;

      if (config.webVitals) {
        onLCP((metric) => reportWebVital(monitor, metric));
        onINP((metric) => reportWebVital(monitor, metric));
        onCLS((metric) => reportWebVital(monitor, metric));
      }

      if (config.longTask && typeof PerformanceObserver !== 'undefined') {
        try {
          longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              monitor.captureEvent('performance', {
                name: 'long-task',
                value: entry.duration,
                detail: {
                  startTime: entry.startTime,
                  name: entry.name,
                },
              });
            }
          });

          longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch {
          // 浏览器不支持 longtask 类型时静默忽略
        }
      }
    },

    destroy() {
      longTaskObserver?.disconnect();
      longTaskObserver = null;
    },
  };
}
