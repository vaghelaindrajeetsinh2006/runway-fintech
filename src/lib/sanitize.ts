import type {
  Commitment,
  DailySnapshot,
  ExpenseCategory,
  ExpenseEntry,
  ExpenseType,
  FinanceData,
  Goal,
  GoalContribution,
  GoalPriority,
  IncomeEntry,
  Subscription,
  SubscriptionCharge,
} from '../types';
import { makeId, sanitizeText } from './format';

const MAX_AMOUNT = 10_000_000;
const CATEGORIES: ExpenseCategory[] = [
  'Food', 'Travel', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other',
];
const GOAL_PRIORITIES: GoalPriority[] = ['Low', 'Medium', 'High'];
const EXPENSE_TYPES: ExpenseType[] = ['discretionary', 'unexpected'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const safeAmount = (value: unknown, allowZero = false): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value > MAX_AMOUNT || value < 0) return null;
  if (!allowZero && value <= 0) return null;
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  if (!allowZero && rounded <= 0) return null;
  return rounded;
};

const safeDay = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 30 ? value : null;

const safeId = (value: unknown, prefix: string): string => {
  if (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) return value;
  return makeId(prefix);
};

const textOr = (value: unknown, fallback: string, max = 64): string =>
  sanitizeText(value, max) || fallback;

const validCategory = (value: unknown): ExpenseCategory =>
  typeof value === 'string' && CATEGORIES.includes(value as ExpenseCategory)
    ? value as ExpenseCategory
    : 'Other';

const recordArray = (value: unknown, fallback: unknown[], limit = 2000): unknown[] =>
  (Array.isArray(value) ? value : fallback).slice(0, limit);

const uniqueSafeId = (value: unknown, prefix: string, seen: Set<string>): string => {
  let id = safeId(value, prefix);
  while (seen.has(id)) id = makeId(prefix);
  seen.add(id);
  return id;
};

export function sanitizeFinanceData(value: unknown, fallback: FinanceData): FinanceData {
  const raw = isRecord(value) ? value : {};
  const rawProfile = isRecord(raw.profile) ? raw.profile : {};
  const fallbackProfile = fallback.profile;
  const startingBalance = safeAmount(rawProfile.startingBalance, true);
  const profile = {
    name: textOr(rawProfile.name, fallbackProfile.name || 'Alex', 32),
    startingBalance: startingBalance ?? fallbackProfile.startingBalance,
    startDay: 1 as const,
    totalDays: 30 as const,
  };
  const currentDay = safeDay(raw.currentDay) ?? fallback.currentDay;

  const incomeIds = new Set<string>();
  const incomes: IncomeEntry[] = recordArray(raw.incomes, fallback.incomes, 5000).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const amount = safeAmount(entry.amount);
    const day = safeDay(entry.day);
    if (amount === null || day === null) return [];
    return [{
      id: uniqueSafeId(entry.id, 'income', incomeIds),
      title: textOr(entry.title, 'Income', 64),
      amount,
      day,
      ...(typeof entry.recurring === 'boolean' ? { recurring: entry.recurring } : {}),
    }];
  });

  const expenseIds = new Set<string>();
  const expenses: ExpenseEntry[] = recordArray(raw.expenses, fallback.expenses, 5000).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const amount = safeAmount(entry.amount);
    const day = safeDay(entry.day);
    if (amount === null || day === null) return [];
    return [{
      id: uniqueSafeId(entry.id, 'expense', expenseIds),
      title: textOr(entry.title, 'Expense', 64),
      amount,
      category: validCategory(entry.category),
      day,
      type: typeof entry.type === 'string' && EXPENSE_TYPES.includes(entry.type as ExpenseType)
        ? entry.type as ExpenseType
        : 'discretionary',
    }];
  });

  const commitmentIds = new Set<string>();
  const commitments: Commitment[] = recordArray(raw.commitments, fallback.commitments, 500).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const amount = safeAmount(entry.amount);
    const dueDay = safeDay(entry.dueDay);
    if (amount === null || dueDay === null) return [];
    const autoPaidDay = safeDay(entry.autoPaidDay);
    return [{
      id: uniqueSafeId(entry.id, 'commitment', commitmentIds),
      title: textOr(entry.title, 'Commitment', 64),
      amount,
      dueDay,
      paid: entry.paid === true,
      skipped: entry.skipped === true,
      ...(autoPaidDay === null ? {} : { autoPaidDay }),
    }];
  });

  const subscriptionIds = new Set<string>();
  const subscriptions: Subscription[] = recordArray(raw.subscriptions, fallback.subscriptions, 500).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const amount = safeAmount(entry.amount);
    const billingDay = safeDay(entry.billingDay);
    if (amount === null || billingDay === null) return [];
    return [{
      id: uniqueSafeId(entry.id, 'subscription', subscriptionIds),
      name: textOr(entry.name, 'Subscription', 64),
      amount,
      billingDay,
      active: entry.active === true,
    }];
  });

  const chargeIds = new Set<string>();
  const subscriptionCharges: SubscriptionCharge[] = recordArray(raw.subscriptionCharges, fallback.subscriptionCharges, 5000).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const amount = safeAmount(entry.amount);
    const day = safeDay(entry.day);
    if (amount === null || day === null) return [];
    return [{
      id: uniqueSafeId(entry.id, 'charge', chargeIds),
      subscriptionId: textOr(entry.subscriptionId, 'removed-subscription', 80),
      day,
      amount,
    }];
  });

  const goalRecordIds = new Set<string>();
  const goals: Goal[] = recordArray(raw.goals, fallback.goals, 500).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const targetAmount = safeAmount(entry.targetAmount);
    const savedAmount = safeAmount(entry.savedAmount, true);
    const monthlyContribution = safeAmount(entry.monthlyContribution, true);
    const deadlineDay = safeDay(entry.deadlineDay);
    if (targetAmount === null || savedAmount === null || monthlyContribution === null || deadlineDay === null) return [];
    const priority = typeof entry.priority === 'string' && GOAL_PRIORITIES.includes(entry.priority as GoalPriority)
      ? entry.priority as GoalPriority
      : 'Medium';
    return [{
      id: uniqueSafeId(entry.id, 'goal', goalRecordIds),
      title: textOr(entry.title, 'Savings goal', 48),
      targetAmount,
      savedAmount: Math.min(savedAmount, targetAmount),
      monthlyContribution,
      deadlineDay,
      priority,
    }];
  });

  const goalIds = new Set(goals.map((goal) => goal.id));
  const contributionIds = new Set<string>();
  const goalContributions: GoalContribution[] = recordArray(raw.goalContributions, fallback.goalContributions, 5000).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const amount = safeAmount(entry.amount);
    const day = safeDay(entry.day);
    const goalId = typeof entry.goalId === 'string' ? entry.goalId : '';
    if (amount === null || day === null || !goalIds.has(goalId)) return [];
    return [{ id: uniqueSafeId(entry.id, 'contribution', contributionIds), goalId, amount, day }];
  });

  const history: DailySnapshot[] = recordArray(raw.history, fallback.history, 30).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const day = safeDay(entry.day);
    const balance = typeof entry.balance === 'number' && Number.isFinite(entry.balance) && Math.abs(entry.balance) <= 100_000_000
      ? entry.balance
      : null;
    const spend = safeAmount(entry.spend, true);
    const allowance = safeAmount(entry.allowance, true);
    if (day === null || balance === null || spend === null || allowance === null) return [];
    return [{ day, balance, spend, allowance }];
  });

  const uniqueHistory = [...new Map(history.map((snapshot) => [snapshot.day, snapshot])).values()]
    .sort((a, b) => a.day - b.day)
    .filter((snapshot) => snapshot.day <= currentDay);

  return {
    profile,
    currentDay,
    incomes,
    expenses,
    commitments,
    subscriptions,
    subscriptionCharges,
    goals,
    goalContributions,
    history: uniqueHistory,
  };
}
