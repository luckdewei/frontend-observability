import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';

/**
 * 事件上报模块
 */
@Module({
  controllers: [IngestController],
  providers: [IngestService],
})
export class IngestModule {}
