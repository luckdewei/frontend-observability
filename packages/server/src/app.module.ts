import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { IngestModule } from './ingest/ingest.module';
import { EventsModule } from './events/events.module';
import { PerformanceModule } from './performance/performance.module';
import { ProjectsModule } from './projects/projects.module';

/**
 * 应用根模块
 * 注册所有功能模块
 */
@Module({
  imports: [
    PrismaModule,
    IngestModule,
    EventsModule,
    PerformanceModule,
    ProjectsModule,
  ],
})
export class AppModule {}
