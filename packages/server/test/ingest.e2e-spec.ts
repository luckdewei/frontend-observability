import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * 事件上报 E2E 测试
 * 验证批量上报接口的基本功能
 */
describe('IngestController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // 确保测试用的演示项目存在
    await prisma.project.upsert({
      where: { appKey: 'demo-app-key' },
      update: {},
      create: { name: '演示项目', appKey: 'demo-app-key' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('缺少 AppKey 时应返回 401', () => {
    return request(app.getHttpServer())
      .post('/api/ingest/batch')
      .send({ events: [] })
      .expect(401);
  });

  it('使用有效 AppKey 应成功上报事件', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/ingest/batch')
      .set('X-App-Key', 'demo-app-key')
      .send({
        events: [
          {
            type: 'ERROR',
            payload: { message: '测试错误', stack: 'Error: 测试错误' },
            url: 'https://example.com',
            sessionId: 'session-001',
          },
        ],
      })
      .expect(201);

    expect(response.body.accepted).toBe(1);
    expect(response.body.message).toContain('成功接收');
  });

  it('无效的事件类型应返回 400', () => {
    return request(app.getHttpServer())
      .post('/api/ingest/batch')
      .set('X-App-Key', 'demo-app-key')
      .send({
        events: [{ type: 'INVALID', payload: {} }],
      })
      .expect(400);
  });
});
