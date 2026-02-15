import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Subscription } from './subscription.entity';
import {
  PLAN_DURATION_DAYS,
  SubscriptionPlan,
  SubscriptionStatus,
} from './subscription.enums';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
  ) {}

  async hasActiveAccess(userId: string): Promise<boolean> {
    const now = new Date();

    const active = await this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .where('subscription.user_id = :userId', { userId })
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.ends_at > :now', { now: now.toISOString() })
      .getExists();

    return active;
  }

  async getCurrent(userId: string): Promise<Subscription | null> {
    const now = new Date();
    return this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .where('subscription.user_id = :userId', { userId })
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.ends_at > :now', { now: now.toISOString() })
      .orderBy('subscription.ends_at', 'DESC')
      .getOne();
  }

  async activateFromPayment(params: {
    userId: string;
    plan: SubscriptionPlan;
    paymentId: string;
    manager?: EntityManager;
  }): Promise<Subscription> {
    const durationDays = PLAN_DURATION_DAYS[params.plan];
    if (!durationDays) {
      throw new BadRequestException('Unsupported plan');
    }

    const repository = params.manager
      ? params.manager.getRepository(Subscription)
      : this.subscriptionsRepository;

    const current = await repository
      .createQueryBuilder('subscription')
      .where('subscription.user_id = :userId', { userId: params.userId })
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.ends_at > :now', { now: new Date().toISOString() })
      .orderBy('subscription.ends_at', 'DESC')
      .getOne();

    const startDate = current ? current.endsAt : new Date();
    const endsAt = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = repository.create({
      userId: params.userId,
      plan: params.plan,
      status: SubscriptionStatus.ACTIVE,
      startsAt: startDate,
      endsAt,
      paymentId: params.paymentId,
    });

    return repository.save(subscription);
  }

  async getStatus(userId: string): Promise<{ active: boolean; endsAt: Date | null }> {
    const current = await this.getCurrent(userId);
    return {
      active: Boolean(current),
      endsAt: current?.endsAt ?? null,
    };
  }

  async expireOutdated(): Promise<number> {
    const result = await this.subscriptionsRepository
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('ends_at <= :now', { now: new Date().toISOString() })
      .execute();

    return result.affected ?? 0;
  }

  async getById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }
}
