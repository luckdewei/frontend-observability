import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { Project } from '@prisma/client';
import { AppKeyGuard } from '../common/guards/app-key.guard';
import { IngestBatchDto } from './ingest.dto';
import { IngestService } from './ingest.service';

/** 扩展 Express Request，附加鉴权后的项目信息 */
interface AuthenticatedRequest extends Request {
  project: Project;
}

/**
 * 事件上报控制器
 * 提供 SDK 批量上报接口
 */
@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  /**
   * POST /api/ingest
   * SDK 默认上报地址，与 /batch 行为一致
   */
  @Post()
  @UseGuards(AppKeyGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async ingest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: IngestBatchDto,
  ) {
    return this.ingestService.ingestBatch(req.project, dto);
  }

  /**
   * POST /api/ingest/batch
   * 批量上报监控事件，需要 X-App-Key 鉴权
   */
  @Post('batch')
  @UseGuards(AppKeyGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async batch(
    @Req() req: AuthenticatedRequest,
    @Body() dto: IngestBatchDto,
  ) {
    return this.ingestService.ingestBatch(req.project, dto);
  }
}
