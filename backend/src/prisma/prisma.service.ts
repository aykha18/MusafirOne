import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const isProduction =
      process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    if (isProduction && !/sslmode=/.test(connectionString)) {
      connectionString =
        connectionString +
        (connectionString.includes('?') ? '&' : '?') +
        'sslmode=require';
    }
    const defaultConnectTimeoutMs =
      process.env.NODE_ENV === 'test' ? 60000 : 20000;
    const pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX ?? 5),
      connectionTimeoutMillis: Number(
        process.env.PG_CONNECT_TIMEOUT_MS ?? defaultConnectTimeoutMs,
      ),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10000),
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    const maxAttempts = Number(process.env.PRISMA_CONNECT_MAX_ATTEMPTS ?? 12);
    let delayMs = 500;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (e) {
        const code = e?.code as string | undefined;
        if (code === 'P1002') {
          this.logger.warn(
            `Prisma connect timed out (code=P1002). Waiting 60s before retry (attempt ${attempt}/${maxAttempts}).`,
          );
          await new Promise((r) => setTimeout(r, 60000));
        }
        if (attempt === maxAttempts) {
          throw e;
        }
        this.logger.warn(
          `Prisma connect failed (attempt ${attempt}/${maxAttempts})${code ? ` code=${code}` : ''}`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs = Math.min(15000, Math.floor(delayMs * 1.6));
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
