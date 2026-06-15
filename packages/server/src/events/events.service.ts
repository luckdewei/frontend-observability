import { Injectable, NotFoundException } from '@nestjs/common';
import { EventType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** 事件列表查询参数 */
export interface EventQueryParams {
  projectId?: string;
  type?: EventType;
  sessionId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 事件查询服务
 * 提供监控事件的列表与详情查询
 */
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询事件列表
   */
  async findAll(params: EventQueryParams) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MonitorEventWhereInput = {};
    if (params.projectId) where.projectId = params.projectId;
    if (params.type) where.type = params.type;
    if (params.sessionId) where.sessionId = params.sessionId;

    const [items, total] = await Promise.all([
      this.prisma.monitorEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.monitorEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据 ID 查询单条事件详情
   */
  async findOne(id: string) {
    const event = await this.prisma.monitorEvent.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, appKey: true } } },
    });

    if (!event) {
      throw new NotFoundException(`事件 ${id} 不存在`);
    }

    return event;
  }
}
