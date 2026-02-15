import { registerAs } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import { Catalog } from '../catalogs/catalog.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { Payment } from '../payments/payment.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { User } from '../users/user.entity';

const entities = [User, RefreshToken, Payment, Subscription, Catalog];

export const buildTypeOrmOptions = (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '123456',
  database: process.env.DB_NAME ?? 'hmk-docs',
  entities,
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: process.env.DB_SYNC === 'true',
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
});

export default registerAs('typeorm', buildTypeOrmOptions);
