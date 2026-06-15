import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 创建项目 DTO */
export interface CreateProjectDto {
  name: string;
  appKey: string;
}

/** 更新项目 DTO */
export interface UpdateProjectDto {
  name?: string;
  appKey?: string;
}

/**
 * 项目管理服务
 * 提供项目的增删改查
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 查询所有项目 */
  async findAll() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { events: true } } },
    });
  }

  /** 根据 ID 查询项目 */
  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { events: true } } },
    });

    if (!project) {
      throw new NotFoundException(`项目 ${id} 不存在`);
    }

    return project;
  }

  /** 创建新项目 */
  async create(dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { appKey: dto.appKey },
    });

    if (existing) {
      throw new ConflictException(`AppKey "${dto.appKey}" 已存在`);
    }

    return this.prisma.project.create({ data: dto });
  }

  /** 更新项目信息 */
  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);

    if (dto.appKey) {
      const existing = await this.prisma.project.findFirst({
        where: { appKey: dto.appKey, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`AppKey "${dto.appKey}" 已被其他项目使用`);
      }
    }

    return this.prisma.project.update({ where: { id }, data: dto });
  }

  /** 删除项目（级联删除关联事件） */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.project.delete({ where: { id } });
  }
}
