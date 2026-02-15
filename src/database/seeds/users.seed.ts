import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import dataSource from '../data-source';
import { User } from '../../users/user.entity';
import { Subscription } from '../../subscriptions/subscription.entity';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../subscriptions/subscription.enums';

interface SeedUser {
  email: string;
  hasSubscription: boolean;
}

const SEED_PASSWORD = process.env.SEED_USERS_PASSWORD ?? '123456789';

const users: SeedUser[] = [
  { email: 'test@test.com', hasSubscription: true },
  { email: 'test1@test.com', hasSubscription: false },
];

function getBcryptSaltRounds(): number {
  const rawValue = process.env.BCRYPT_SALT_ROUNDS ?? '12';
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 4 || parsed > 15) {
    return 12;
  }
  return parsed;
}

async function ensureUser(
  userRepo: Repository<User>,
  email: string,
  passwordHash: string,
): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await userRepo.findOne({ where: { email: normalizedEmail } });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.isActive = true;
    const updated = await userRepo.save(existing);
    console.log(`[seed] user updated: ${normalizedEmail}`);
    return updated;
  }

  const created = userRepo.create({
    email: normalizedEmail,
    passwordHash,
    isActive: true,
  });

  const saved = await userRepo.save(created);
  console.log(`[seed] user inserted: ${normalizedEmail}`);
  return saved;
}

async function ensureSubscription(
  subscriptionRepo: Repository<Subscription>,
  userId: string,
): Promise<void> {
  const now = new Date();
  const startsAt = now;
  const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const current = await subscriptionRepo
    .createQueryBuilder('subscription')
    .where('subscription.user_id = :userId', { userId })
    .andWhere('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
    .andWhere('subscription.ends_at > :now', { now: now.toISOString() })
    .orderBy('subscription.ends_at', 'DESC')
    .getOne();

  if (current) {
    current.plan = SubscriptionPlan.WEEK;
    current.startsAt = startsAt;
    current.endsAt = endsAt;
    current.status = SubscriptionStatus.ACTIVE;
    current.paymentId = null;
    await subscriptionRepo.save(current);
    console.log(`[seed] subscription updated for user: ${userId}`);
    return;
  }

  const subscription = subscriptionRepo.create({
    userId,
    plan: SubscriptionPlan.WEEK,
    status: SubscriptionStatus.ACTIVE,
    startsAt,
    endsAt,
    paymentId: null,
  });

  await subscriptionRepo.save(subscription);
  console.log(`[seed] subscription inserted for user: ${userId}`);
}

async function expireActiveSubscriptions(
  subscriptionRepo: Repository<Subscription>,
  userId: string,
): Promise<void> {
  const result = await subscriptionRepo
    .createQueryBuilder()
    .update(Subscription)
    .set({ status: SubscriptionStatus.EXPIRED })
    .where('user_id = :userId', { userId })
    .andWhere('status = :status', { status: SubscriptionStatus.ACTIVE })
    .execute();

  if ((result.affected ?? 0) > 0) {
    console.log(`[seed] expired active subscriptions for user: ${userId}`);
  }
}

async function run(): Promise<void> {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const subscriptionRepo = dataSource.getRepository(Subscription);
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, getBcryptSaltRounds());

  for (const entry of users) {
    const user = await ensureUser(userRepo, entry.email, passwordHash);

    if (entry.hasSubscription) {
      await ensureSubscription(subscriptionRepo, user.id);
      continue;
    }

    await expireActiveSubscriptions(subscriptionRepo, user.id);
  }

  console.log(`[seed] done. Password for seeded users: ${SEED_PASSWORD}`);
  await dataSource.destroy();
}

run().catch(async (error) => {
  console.error('[seed] failed', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
