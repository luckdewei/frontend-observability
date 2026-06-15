import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * AppKey 鉴权守卫
 * 从请求头 X-App-Key 中读取应用密钥，验证项目是否存在
 */
@Injectable()
export class AppKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const appKey =
      request.headers['x-app-key'] || request.headers['X-App-Key'];

    if (!appKey || typeof appKey !== 'string') {
      throw new UnauthorizedException('缺少 X-App-Key 请求头');
    }

    const project = await this.prisma.project.findUnique({
      where: { appKey },
    });

    if (!project) {
      throw new UnauthorizedException('无效的 AppKey');
    }

    // 将项目信息挂载到请求对象，供后续处理器使用
    request.project = project;
    return true;
  }
}
