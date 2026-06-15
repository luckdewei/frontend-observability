import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventType } from '@prisma/client';
import { EventsService } from './events.service';

/**
 * 事件查询控制器
 * 提供事件列表与详情接口
 */
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/events
   * 分页查询监控事件，支持按项目、类型、会话筛选
   */
  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('type') type?: EventType,
    @Query('sessionId') sessionId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.eventsService.findAll({
      projectId,
      type,
      sessionId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  /**
   * GET /api/events/:id
   * 查询单条事件详情
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
}
