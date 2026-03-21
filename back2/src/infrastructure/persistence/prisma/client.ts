import { PrismaClient } from '@prisma/client';
import { logger } from '../../../shared/utils/logger';
import { config } from '../../../shared/config';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [{ emit: 'event', level: 'error' }],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (config.env !== 'production') {
  globalThis.prisma = prisma;
}

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error({ error: e.message }, 'Prisma error');
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
