import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 数据库种子脚本
 * 创建默认演示项目，appKey 为 demo-app-key
 */
async function main() {
  const project = await prisma.project.upsert({
    where: { appKey: 'demo-app-key' },
    update: {},
    create: {
      name: '演示项目',
      appKey: 'demo-app-key',
    },
  });

  console.log('种子数据已创建:', project);
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
