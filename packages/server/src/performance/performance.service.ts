import { Injectable } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** 性能摘要查询参数 */
export interface PerformanceSummaryParams {
  projectId?: string;
  /** 统计最近 N 小时的数据，默认 24 */
  hours?: number;
}

/**
 * 性能分析服务
 * 聚合性能事件，生成摘要统计
 */
@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取性能事件摘要
   * 包含事件数量、平均加载时间等指标
   */
  async getSummary(params: PerformanceSummaryParams) {
    const hours = params.hours ?? 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const where = {
      type: EventType.PERFORMANCE,
      createdAt: { gte: since },
      ...(params.projectId ? { projectId: params.projectId } : {}),
    };

    const events = await this.prisma.monitorEvent.findMany({
      where,
      select: { payload: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // 从 payload 中提取性能指标并聚合
    const metrics = {
      totalEvents: events.length,
      avgLoadTime: 0,
      avgFcp: 0,
      avgLcp: 0,
      avgTtfb: 0,
    };

    if (events.length > 0) {
      let loadTimeSum = 0;
      let fcpSum = 0;
      let lcpSum = 0;
      let ttfbSum = 0;
      let loadTimeCount = 0;
      let fcpCount = 0;
      let lcpCount = 0;
      let ttfbCount = 0;

      for (const event of events) {
        const payload = event.payload as Record<string, number>;
        if (typeof payload.loadTime === 'number') {
          loadTimeSum += payload.loadTime;
          loadTimeCount++;
        }
        if (typeof payload.fcp === 'number') {
          fcpSum += payload.fcp;
          fcpCount++;
        }
        if (typeof payload.lcp === 'number') {
          lcpSum += payload.lcp;
          lcpCount++;
        }
        if (typeof payload.ttfb === 'number') {
          ttfbSum += payload.ttfb;
          ttfbCount++;
        }
      }

      metrics.avgLoadTime = loadTimeCount > 0 ? loadTimeSum / loadTimeCount : 0;
      metrics.avgFcp = fcpCount > 0 ? fcpSum / fcpCount : 0;
      metrics.avgLcp = lcpCount > 0 ? lcpSum / lcpCount : 0;
      metrics.avgTtfb = ttfbCount > 0 ? ttfbSum / ttfbCount : 0;
    }

    return {
      period: { hours, since },
      metrics,
    };
  }
}
