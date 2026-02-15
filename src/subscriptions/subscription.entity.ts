import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { SubscriptionPlan, SubscriptionStatus } from './subscription.enums';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: SubscriptionPlan })
  plan!: SubscriptionPlan;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @ManyToOne(() => Payment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment | null;

  @Column({ type: 'uuid', name: 'payment_id', nullable: true })
  paymentId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
