import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RefreshToken } from '../auth/refresh-token.entity';
import { Payment } from '../payments/payment.entity';
import { Subscription } from '../subscriptions/subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments!: Payment[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions!: Subscription[];
}
