import { Injectable } from '@nestjs/common';
import { EventType, Prisma, Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IngestBatchDto, IngestEventDto } from './ingest.dto';

/** 已归一化的事件类型 */
interface NormalizedIngestEvent extends Omit<IngestEventDto, 'type'> {
  type: EventType;
}

/** SDK 事件类型与数据库枚举的映射 */
const SDK_EVENT_TYPE_MAP: Record<string, EventType> = {
  error: EventType.ERROR,
  ERROR: EventType.ERROR,
  performance: EventType.PERFORMANCE,
  PERFORMANCE: EventType.PERFORMANCE,
  replay: EventType.REPLAY,
  REPLAY: EventType.REPLAY,
};

function normalizeEvent(event: IngestEventDto): NormalizedIngestEvent | null {
  const normalizedType = SDK_EVENT_TYPE_MAP[String(event.type)];
  if (!normalizedType) {
    return null;
  }

  return {
    ...event,
    type: normalizedType,
  };
}

/**
 * 事件上报服务
 * 处理 SDK 批量上报的监控事件
 */
@Injectable()
export class IngestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 批量写入监控事件
   */
  async ingestBatch(project: Project, dto: IngestBatchDto) {
    const events = dto.events
      .map((event) => normalizeEvent(event))
      .filter((event): event is NormalizedIngestEvent => event !== null);

    if (events.length === 0) {
      return {
        accepted: 0,
        message: '没有可接收的事件',
      };
    }

    const data = events.map((event) => ({
      projectId: project.id,
      type: event.type,
      payload: event.payload as Prisma.InputJsonValue,
      sessionId: event.sessionId,
      userId: event.userId,
      url: event.url,
      userAgent: event.userAgent,
    }));

    const result = await this.prisma.monitorEvent.createMany({ data });

    return {
      accepted: result.count,
      message: `成功接收 ${result.count} 条事件`,
    };
  }
}
