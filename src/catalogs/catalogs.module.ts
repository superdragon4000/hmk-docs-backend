import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Catalog } from './catalog.entity';
import { CatalogsService } from './catalogs.service';
import { CatalogsController } from './catalogs.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuthModule } from '../auth/auth.module';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Catalog]), JwtModule.register({}), SubscriptionsModule, AuthModule],
  providers: [CatalogsService, AdminApiKeyGuard],
  controllers: [CatalogsController],
  exports: [CatalogsService],
})
export class CatalogsModule {}
