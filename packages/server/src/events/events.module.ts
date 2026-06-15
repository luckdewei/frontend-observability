import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

/**
 * 事件查询模块
 */
@Module({
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
