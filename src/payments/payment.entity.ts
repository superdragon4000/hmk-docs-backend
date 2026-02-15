import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { SubscriptionPlan } from '../subscriptions/subscription.enums';
import { PaymentProvider, PaymentStatus } from './payment.enums';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: PaymentProvider, default: PaymentProvider.YOOKASSA })
  provider!: PaymentProvider;

  @Column({ type: 'varchar', name: 'provider_payment_id', unique: true, nullable: true })
  providerPaymentId!: string | null;

  @Column({ name: 'idempotence_key', unique: true })
  idempotenceKey!: string;

  @Column({ type: 'enum', enum: SubscriptionPlan })
  plan!: SubscriptionPlan;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount!: string;

  @Column({ default: 'RUB' })
  currency!: string;

  @Column({ type: 'varchar', name: 'confirmation_url', nullable: true })
  confirmationUrl!: string | null;

  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
