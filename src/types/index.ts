export type ExpenseCategory =
  | 'Food'
  | 'Travel'
  | 'Shopping'
  | 'Entertainment'
  | 'Bills'
  | 'Health'
  | 'Education'
  | 'Other';

export type ExpenseType = 'discretionary' | 'unexpected';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type HealthLabel = 'Thriving' | 'Stable' | 'Shaky' | 'Critical';
export type GoalPriority = 'Low' | 'Medium' | 'High';
export type GoalStatus = 'Complete' | 'On track' | 'At risk' | 'Off track';

export interface Profile {
  name: string;
  startingBalance: number;
  startDay: 1;
  totalDays: 30;
}

export interface IncomeEntry {
  id: string;
  title: string;
  amount: number;
  day: number;
  recurring?: boolean;
}

export interface ExpenseEntry {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  day: number;
  type: ExpenseType;
}

export interface Commitment {
  id: string;
  title: string;
  amount: number;
  dueDay: number;
  paid: boolean;
  skipped?: boolean;
  /** Set only when Runway auto-paid the commitment while moving the timeline. */
  autoPaidDay?: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  active: boolean;
}

export interface SubscriptionCharge {
  id: string;
  subscriptionId: string;
  day: number;
  amount: number;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  /** Baseline savings already set aside before this 30-day runway. */
  savedAmount: number;
  deadlineDay: number;
  monthlyContribution: number;
  priority: GoalPriority;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  day: number;
}

export interface DailySnapshot {
  day: number;
  balance: number;
  spend: number;
  allowance: number;
}

export interface FinanceData {
  profile: Profile;
  currentDay: number;
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  commitments: Commitment[];
  subscriptions: Subscription[];
  subscriptionCharges: SubscriptionCharge[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  history: DailySnapshot[];
}

export type DecisionType =
  | 'one_time_purchase'
  | 'new_subscription'
  | 'recurring_habit'
  | 'cancel_subscription'
  | 'extra_income'
  | 'goal_contribution'
  | 'skip_commitment'
  | 'unexpected_expense';

export interface DecisionDraft {
  type: DecisionType;
  title: string;
  amount: number;
  category: ExpenseCategory;
  targetId?: string;
  billingDay?: number;
  expenseDay?: number;
}

export interface ForecastPoint {
  day: number;
  balance: number;
  projected: boolean;
}

export interface HealthBreakdown {
  runway: number;
  pace: number;
  savings: number;
  obligations: number;
  buffer: number;
}

export interface FinanceMetrics {
  balance: number;
  upcomingObligations: number;
  upcomingItems: Array<{ id: string; title: string; amount: number; day: number; kind: 'commitment' | 'subscription' }>;
  goalReserve: number;
  daysLeft: number;
  safeDailyAllowance: number;
  avgDailySpend: number;
  forecast: ForecastPoint[];
  projectedEndBalance: number;
  projectedZeroDay: number | null;
  runwayDays: number;
  riskLevel: RiskLevel;
  riskReason: string;
  healthScore: number;
  healthLabel: HealthLabel;
  healthBreakdown: HealthBreakdown;
  topImprovements: string[];
  overspendStreak: number;
}

export interface FinanceSnapshot extends FinanceData {
  onboardingComplete: boolean;
}

export interface UndoEntry {
  snapshot: FinanceSnapshot;
  message: string;
}
