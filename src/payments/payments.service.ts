import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Payment } from './payment.entity';
import { PaymentProvider, PaymentStatus } from './payment.enums';
import { SubscriptionPlan, PLAN_PRICE_RUB } from '../subscriptions/subscription.enums';
import { YooKassaClient } from './yookassa.client';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly yooKassaClient: YooKassaClient,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async createPayment(userId: string, plan: SubscriptionPlan): Promise<Payment> {
    const amount = PLAN_PRICE_RUB[plan];
    if (!amount) {
      throw new BadRequestException('Unsupported plan');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const idempotenceKey = randomUUID();

    const payment = this.paymentsRepository.create({
      userId,
      provider: PaymentProvider.YOOKASSA,
      status: PaymentStatus.PENDING,
      amount: amount.toFixed(2),
      currency: 'RUB',
      idempotenceKey,
      plan,
      providerPaymentId: null,
      confirmationUrl: null,
      rawPayload: null,
    });

    const saved = await this.paymentsRepository.save(payment);

    const created = await this.yooKassaClient.createPayment({
      idempotenceKey,
      amount: saved.amount,
      currency: saved.currency,
      description: `HMK Docs ${plan} access`,
      metadata: {
        localPaymentId: saved.id,
        userId,
        plan,
      },
    });

    saved.providerPaymentId = String(created.id);
    saved.confirmationUrl = String(created.confirmation?.confirmation_url ?? '');
    saved.rawPayload = created;

    const updated = await this.paymentsRepository.save(saved);

    if (updated.confirmationUrl) {
      await this.mailService.sendPaymentCreatedEmail(user.email, updated.confirmationUrl);
    }

    return updated;
  }

  async getUserPayment(userId: string, paymentId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({ where: { id: paymentId, userId } });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async handleYooKassaWebhook(payload: Record<string, any>): Promise<void> {
    const object = payload.object;
    if (!object?.id) {
      throw new BadRequestException('Invalid webhook payload');
    }

    await this.processProviderPayment(String(object.id), object);
  }

  async reconcilePendingPayments(): Promise<number> {
    const pendingPayments = await this.paymentsRepository.find({
      where: { status: PaymentStatus.PENDING },
      take: 100,
      order: { createdAt: 'ASC' },
    });

    let processed = 0;

    for (const payment of pendingPayments) {
      if (!payment.providerPaymentId) {
        continue;
      }

      try {
        const providerPayment = await this.yooKassaClient.getPayment(payment.providerPaymentId);
        await this.processProviderPayment(payment.providerPaymentId, providerPayment);
        processed += 1;
      } catch (error) {
        this.logger.warn(`Reconcile failed for ${payment.id}: ${(error as Error).message}`);
      }
    }

    return processed;
  }

  async processProviderPayment(
    providerPaymentId: string,
    providerObject?: Record<string, any>,
  ): Promise<void> {
    const payment = await this.paymentsRepository.findOne({
      where: { providerPaymentId },
    });

    if (!payment) {
      this.logger.warn(`Payment with provider id ${providerPaymentId} not found`);
      return;
    }

    const providerData =
      providerObject ?? (await this.yooKassaClient.getPayment(providerPaymentId));

    const status = String(providerData.status ?? '').toLowerCase();

    if (status === 'succeeded') {
      await this.completePaymentTransaction(payment.id, providerData);
      return;
    }

    if (status === 'canceled') {
      await this.cancelPayment(payment.id, providerData);
    }
  }

  private async completePaymentTransaction(
    paymentId: string,
    providerData: Record<string, any>,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status === PaymentStatus.SUCCEEDED) {
        await queryRunner.commitTransaction();
        return;
      }

      payment.status = PaymentStatus.SUCCEEDED;
      payment.rawPayload = providerData;
      await queryRunner.manager.save(payment);

      const subscription = await this.subscriptionsService.activateFromPayment({
        userId: payment.userId,
        plan: payment.plan,
        paymentId: payment.id,
        manager: queryRunner.manager,
      });

      await queryRunner.commitTransaction();

      const user = await this.usersService.findById(payment.userId);
      if (user) {
        await this.mailService.sendPaymentSucceededEmail(user.email, subscription.endsAt);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async cancelPayment(paymentId: string, providerData: Record<string, any>): Promise<void> {
    const payment = await this.paymentsRepository.findOne({ where: { id: paymentId } });
    if (!payment || payment.status !== PaymentStatus.PENDING) {
      return;
    }

    payment.status = PaymentStatus.CANCELED;
    payment.rawPayload = providerData;
    await this.paymentsRepository.save(payment);

    const user = await this.usersService.findById(payment.userId);
    if (user) {
      await this.mailService.sendPaymentFailedEmail(user.email);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async maintenanceJob(): Promise<void> {
    await this.subscriptionsService.expireOutdated();
    await this.reconcilePendingPayments();
  }
}
