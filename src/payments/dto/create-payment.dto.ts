import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from '../../subscriptions/subscription.enums';

export class CreatePaymentDto {
  @ApiProperty({ enum: SubscriptionPlan, enumName: 'SubscriptionPlan' })
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;
}
