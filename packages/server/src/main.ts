import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * 应用启动入口
 * 配置全局前缀、CORS、参数校验等
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 所有 API 路由统一使用 /api 前缀
  app.setGlobalPrefix('api');

  // 启用跨域，允许前端 SDK 和 Dashboard 访问
  app.enableCors();

  // 全局参数校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`前端可观测性服务已启动: http://localhost:${port}/api`);
}

bootstrap();
