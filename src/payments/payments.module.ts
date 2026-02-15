import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './payment.entity';
import { YooKassaClient } from './yookassa.client';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    SubscriptionsModule,
    UsersModule,
    MailModule,
    AuthModule,
  ],
  providers: [PaymentsService, YooKassaClient],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
