import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  ProjectsService,
  CreateProjectDto,
  UpdateProjectDto,
} from './projects.service';

/** 创建项目请求体校验 */
class CreateProjectBody implements CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  appKey!: string;
}

/** 更新项目请求体校验 */
class UpdateProjectBody implements UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  appKey?: string;
}

/**
 * 项目管理控制器
 * 提供项目 CRUD 接口
 */
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** GET /api/projects - 获取所有项目 */
  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  /** GET /api/projects/:id - 获取单个项目 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  /** POST /api/projects - 创建项目 */
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() body: CreateProjectBody) {
    return this.projectsService.create(body);
  }

  /** PUT /api/projects/:id - 更新项目 */
  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param('id') id: string, @Body() body: UpdateProjectBody) {
    return this.projectsService.update(id, body);
  }

  /** DELETE /api/projects/:id - 删除项目 */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
