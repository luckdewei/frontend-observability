import { Controller, Get, Query } from '@nestjs/common';
import { PerformanceService } from './performance.service';

/**
 * 性能分析控制器
 * 提供性能数据摘要接口
 */
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  /**
   * GET /api/performance/summary
   * 获取性能事件聚合摘要
   */
  @Get('summary')
  getSummary(
    @Query('projectId') projectId?: string,
    @Query('hours') hours?: string,
  ) {
    return this.performanceService.getSummary({
      projectId,
      hours: hours ? parseInt(hours, 10) : undefined,
    });
  }
}
