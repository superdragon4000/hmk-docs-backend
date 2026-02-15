export enum SubscriptionPlan {
  DAY = 'DAY',
  WEEK = 'WEEK',
}

export const PLAN_DURATION_DAYS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.DAY]: 1,
  [SubscriptionPlan.WEEK]: 7,
};

export const PLAN_PRICE_RUB: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.DAY]: 199,
  [SubscriptionPlan.WEEK]: 990,
};

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}
