import type {
  Commitment,
  DecisionDraft,
  ExpenseCategory,
  FinanceData,
  FinanceMetrics,
  Goal,
  GoalStatus,
  HealthLabel,
  RiskLevel,
} from '../types';
import { clamp, makeId, safePositiveAmount, sanitizeText } from './format';

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export const getGoalSavedAmount = (goal: Goal, state: FinanceData, day = state.currentDay): number =>
  goal.savedAmount + sum(state.goalContributions
    .filter((contribution) => contribution.goalId === goal.id && contribution.day <= day)
    .map((contribution) => contribution.amount));

/**
 * Finance model: balance is starting budget + received income − expenses − paid commitments
 * − subscription charges − goal contributions. Events after the simulated day do not affect it.
 */
export const calculateBalance = (state: FinanceData, day = state.currentDay): number => {
  const income = sum(state.incomes.filter((item) => item.day <= day).map((item) => item.amount));
  const expenses = sum(state.expenses.filter((item) => item.day <= day).map((item) => item.amount));
  const commitments = sum(state.commitments
    .filter((item) => item.paid && !item.skipped && (item.autoPaidDay === undefined || item.autoPaidDay <= day))
    .map((item) => item.amount));
  const subscriptions = sum(state.subscriptionCharges.filter((item) => item.day <= day).map((item) => item.amount));
  const contributions = sum(state.goalContributions.filter((item) => item.day <= day).map((item) => item.amount));
  return state.profile.startingBalance + income - expenses - commitments - subscriptions - contributions;
};

export const getUpcomingItems = (state: FinanceData) => {
  const commitments = state.commitments
    .filter((item) => !item.skipped && (!item.paid || (item.autoPaidDay !== undefined && item.autoPaidDay > state.currentDay)))
    .map((item) => ({
      id: item.id,
      title: item.title,
      amount: item.amount,
      day: Math.max(state.currentDay, item.dueDay),
      kind: 'commitment' as const,
    }));
  const subscriptions = state.subscriptions
    .filter((item) => item.active && item.billingDay > state.currentDay)
    .filter((item) => !state.subscriptionCharges.some((charge) => charge.subscriptionId === item.id && charge.day === item.billingDay))
    .map((item) => ({
      id: item.id,
      title: item.name,
      amount: item.amount,
      day: item.billingDay,
      kind: 'subscription' as const,
    }));
  return [...commitments, ...subscriptions].sort((a, b) => a.day - b.day);
};

export const calculateGoalReserve = (state: FinanceData, balance = calculateBalance(state)): number => {
  const obligations = sum(getUpcomingItems(state).map((item) => item.amount));
  const availableForGoals = Math.max(0, balance - obligations);
  const planned = state.goals.reduce((total, goal) => {
    const saved = getGoalSavedAmount(goal, state);
    const remaining = Math.max(0, goal.targetAmount - saved);
    const deadline = Math.min(state.profile.totalDays, Math.max(state.currentDay, goal.deadlineDay));
    const daysUntilDeadline = Math.max(0, deadline - state.currentDay + 1);
    const proRatedPlan = goal.monthlyContribution * (daysUntilDeadline / state.profile.totalDays);
    return total + Math.min(remaining, proRatedPlan);
  }, 0);
  // The goal reserve protects only money that exists after near-term commitments.
  return Math.min(planned, availableForGoals);
};

const getAverageDailySpend = (state: FinanceData, allowance: number): number => {
  const elapsed = Math.max(1, state.currentDay - state.profile.startDay + 1);
  const spent = sum(state.expenses
    .filter((item) => item.day <= state.currentDay && !item.title.endsWith(' · daily') && !item.title.endsWith(' · weekly') && (item.type === 'discretionary' || item.type === 'unexpected'))
    .map((item) => item.amount));
  const observedAverage = spent / elapsed;
  // In the first few days the sample is noisy. Blend real spend with the safe allowance.
  const confidence = clamp(elapsed / 5, 0.2, 1);
  return observedAverage * confidence + allowance * (1 - confidence);
};

const buildForecast = (state: FinanceData, balance: number, avgDailySpend: number) => {
  const points: FinanceMetrics['forecast'] = [{ day: state.currentDay, balance, projected: false }];
  let projected = balance;
  for (let day = state.currentDay + 1; day <= state.profile.totalDays; day += 1) {
    projected -= avgDailySpend;
    projected += sum(state.incomes.filter((item) => item.day === day).map((item) => item.amount));
    // Future-dated transactions are explicit planned costs on top of the average daily pace.
    projected -= sum(state.expenses.filter((item) => item.day === day).map((item) => item.amount));
    const dueCommitments = state.commitments.filter((item) =>
      !item.skipped && (!item.paid || (item.autoPaidDay !== undefined && item.autoPaidDay > state.currentDay)) && item.dueDay === day,
    );
    projected -= sum(dueCommitments.map((item) => item.amount));

    const dueSubscriptions = state.subscriptions.filter((item) =>
      item.active && item.billingDay === day &&
      !state.subscriptionCharges.some((charge) => charge.subscriptionId === item.id && charge.day === day),
    );
    projected -= sum(dueSubscriptions.map((item) => item.amount));
    points.push({ day, balance: projected, projected: true });
  }
  return points;
};

const calculateOverspendStreak = (state: FinanceData, allowance: number): number => {
  const byDay = new Map<number, number>();
  for (const expense of state.expenses) {
    if (expense.day <= state.currentDay) byDay.set(expense.day, (byDay.get(expense.day) ?? 0) + expense.amount);
  }
  let streak = 0;
  const history = new Map(state.history.map((snapshot) => [snapshot.day, snapshot]));
  for (let day = state.currentDay; day >= state.profile.startDay; day -= 1) {
    const snapshot = history.get(day);
    const spend = snapshot?.spend ?? (byDay.get(day) ?? 0);
    const limit = snapshot?.allowance ?? allowance;
    if (limit > 0 && spend > limit * 1.15) streak += 1;
    else break;
  }
  return streak;
};

const getGoalProgressScore = (state: FinanceData): number => {
  if (state.goals.length === 0) return 65;
  const values = state.goals.map((goal) => {
    const progress = clamp(getGoalSavedAmount(goal, state) / Math.max(1, goal.targetAmount), 0, 1);
    const expected = clamp(state.currentDay / Math.max(1, goal.deadlineDay), 0, 1);
    return expected === 0 ? progress * 100 : clamp((progress / expected) * 100, 0, 100);
  });
  return sum(values) / values.length;
};

const getHealthLabel = (score: number): HealthLabel => {
  if (score >= 85) return 'Thriving';
  if (score >= 70) return 'Stable';
  if (score >= 45) return 'Shaky';
  return 'Critical';
};

export const getGoalStatus = (goal: Goal, state: FinanceData): GoalStatus => {
  const saved = getGoalSavedAmount(goal, state);
  if (saved >= goal.targetAmount) return 'Complete';

  const expectedProgress = clamp(state.currentDay / Math.max(1, goal.deadlineDay), 0, 1);
  const actualProgress = saved / Math.max(1, goal.targetAmount);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const daysUntilDeadline = Math.max(1, goal.deadlineDay - state.currentDay + 1);
  const requiredDaily = remaining / daysUntilDeadline;
  const balance = calculateBalance(state);
  const reservedBills = sum(getUpcomingItems(state)
    .filter((item) => item.day <= goal.deadlineDay)
    .map((item) => item.amount));
  const spendableAfterBills = Math.max(0, balance - reservedBills);
  const cashShortfall = remaining > spendableAfterBills;

  // Status reacts both to progress already made and to whether the remaining
  // target is still plausible after protecting known bills from the same cash.
  if (actualProgress < expectedProgress * 0.65 || cashShortfall || requiredDaily > Math.max(1, spendableAfterBills / daysUntilDeadline) * 1.5) {
    return 'Off track';
  }
  if (actualProgress < expectedProgress * 0.9 || requiredDaily > Math.max(1, spendableAfterBills / daysUntilDeadline)) {
    return 'At risk';
  }
  return 'On track';
};

export const calculateMetrics = (state: FinanceData): FinanceMetrics => {
  const balance = calculateBalance(state);
  const upcomingItems = getUpcomingItems(state);
  const upcomingObligations = sum(upcomingItems.map((item) => item.amount));
  const goalReserve = calculateGoalReserve(state, balance);
  const daysLeft = Math.max(0, state.profile.totalDays - state.currentDay + 1);
  const safeDailyAllowance = Math.max(0, (balance - upcomingObligations - goalReserve) / Math.max(1, daysLeft));
  const avgDailySpend = getAverageDailySpend(state, safeDailyAllowance);
  const forecast = buildForecast(state, balance, avgDailySpend);
  const projectedEndBalance = forecast.length ? forecast[forecast.length - 1].balance : balance;
  const projectedZero = forecast.find((point) => point.balance <= 0);
  const projectedZeroDay = projectedZero ? projectedZero.day : null;
  const runwayDays = avgDailySpend > 0 ? (balance - upcomingObligations) / avgDailySpend : Number.POSITIVE_INFINITY;
  const overspendStreak = calculateOverspendStreak(state, safeDailyAllowance);

  let riskLevel: RiskLevel = 'Low';
  let riskReason = 'Your spending pace leaves room for the rest of the month.';
  if (balance <= 0 || (projectedEndBalance < -state.profile.startingBalance * 0.1)) {
    riskLevel = 'Critical';
    riskReason = balance <= 0 ? 'Your available balance has reached zero.' : 'Your current pace projects a serious shortfall by month-end.';
  } else if (projectedEndBalance < 0 || runwayDays < daysLeft * 0.55 || overspendStreak >= 3) {
    riskLevel = 'High';
    riskReason = projectedZeroDay
      ? `At this pace, your money could run out around Day ${projectedZeroDay}.`
      : overspendStreak >= 3
        ? `You have spent above your daily pace for ${overspendStreak} days in a row.`
        : 'Your money may not cover the remaining days and commitments.';
  } else if (runwayDays < daysLeft * 0.85 || projectedEndBalance < state.profile.startingBalance * 0.1 || (balance > 0 && upcomingObligations / balance > 0.35)) {
    riskLevel = 'Medium';
    riskReason = 'A few upcoming commitments could squeeze your flexible spending.';
  }

  const healthBreakdown = {
    runway: clamp(Number.isFinite(runwayDays) ? (runwayDays / Math.max(1, daysLeft)) * 100 : 100, 0, 100),
    pace: avgDailySpend <= 0 ? 100 : clamp((safeDailyAllowance / avgDailySpend) * 100, 0, 100),
    savings: getGoalProgressScore(state),
    obligations: balance <= 0 ? 0 : clamp(100 - (upcomingObligations / balance) * 150, 0, 100),
    buffer: state.profile.startingBalance <= 0 ? 0 : clamp((balance / state.profile.startingBalance) * 333, 0, 100),
  };
  const healthScore = Math.round(
    healthBreakdown.runway * 0.3 +
    healthBreakdown.pace * 0.25 +
    healthBreakdown.savings * 0.2 +
    healthBreakdown.obligations * 0.15 +
    healthBreakdown.buffer * 0.1,
  );

  const topImprovements: string[] = [];
  if (avgDailySpend > safeDailyAllowance) topImprovements.push(`Bring daily spending closer to ${Math.round(safeDailyAllowance)}.`);
  const activeSubs = state.subscriptions.filter((item) => item.active).sort((a, b) => b.amount - a.amount);
  if (activeSubs.length >= 2 && activeSubs[0].amount > 0) topImprovements.push(`Review ${activeSubs[0].name}; pausing it saves ${Math.round(activeSubs[0].amount)} this cycle.`);
  if (state.goals.some((goal) => getGoalStatus(goal, state) === 'Off track')) topImprovements.push('Make a smaller, consistent contribution to your most important goal.');
  if (upcomingObligations > balance * 0.25) topImprovements.push('Keep upcoming commitments ring-fenced before making a big purchase.');
  if (topImprovements.length < 2) topImprovements.push('Keep checking the Decision Lab before non-essential spends.');

  return {
    balance,
    upcomingObligations,
    upcomingItems,
    goalReserve,
    daysLeft,
    safeDailyAllowance,
    avgDailySpend,
    forecast,
    projectedEndBalance,
    projectedZeroDay,
    runwayDays,
    riskLevel,
    riskReason,
    healthScore,
    healthLabel: getHealthLabel(healthScore),
    healthBreakdown,
    topImprovements: topImprovements.slice(0, 2),
    overspendStreak,
  };
};

export const generateSmartAlerts = (state: FinanceData): Array<{ id: string; tone: 'red' | 'amber' | 'green' | 'blue'; title: string; detail: string }> => {
  const metrics = calculateMetrics(state);
  const alerts: Array<{ id: string; tone: 'red' | 'amber' | 'green' | 'blue'; title: string; detail: string }> = [];
  if (metrics.balance <= 0) {
    alerts.push({ id: 'balance-zero', tone: 'red', title: 'Your available balance has reached zero', detail: 'Pause flexible spending and review upcoming commitments before the next move.' });
  }
  if (metrics.projectedZeroDay && metrics.projectedZeroDay > state.currentDay) {
    alerts.push({
      id: 'run-out', tone: metrics.projectedZeroDay <= state.currentDay + 7 ? 'red' : 'amber',
      title: `Money could run out on Day ${metrics.projectedZeroDay}`,
      detail: 'Your current spending pace plus upcoming commitments points to a shortfall.',
    });
  }
  const tomorrowSubs = state.subscriptions.filter((item) => item.active && item.billingDay === state.currentDay + 1);
  for (const subscription of tomorrowSubs.slice(0, 1)) {
    alerts.push({ id: `sub-${subscription.id}`, tone: 'amber', title: `${subscription.name} bills tomorrow`, detail: `${Math.round(subscription.amount)} will be reserved from your runway.` });
  }
  const offTrackGoal = state.goals.find((goal) => getGoalStatus(goal, state) === 'Off track');
  if (offTrackGoal) {
    const gap = Math.max(0, offTrackGoal.targetAmount * (state.currentDay / Math.max(1, offTrackGoal.deadlineDay)) - getGoalSavedAmount(offTrackGoal, state));
    alerts.push({ id: `goal-${offTrackGoal.id}`, tone: 'amber', title: `${offTrackGoal.title} needs a nudge`, detail: `About ${Math.round(gap)} behind its planned pace.` });
  }
  if (metrics.safeDailyAllowance < metrics.avgDailySpend && alerts.length < 3) {
    alerts.push({ id: 'pace', tone: 'red', title: 'Your spending pace is above safe', detail: `Try to keep flexible spending near ${Math.round(metrics.safeDailyAllowance)} per day.` });
  }
  if (!alerts.length) alerts.push({ id: 'good-shape', tone: 'green', title: 'You have breathing room', detail: 'No urgent warning right now. Keep your next few decisions intentional.' });
  return alerts.slice(0, 3);
};

export const applyDecisionDraft = (source: FinanceData, draft: DecisionDraft): { data?: FinanceData; error?: string; message?: string } => {
  const data: FinanceData = {
    ...source,
    profile: { ...source.profile },
    incomes: [...source.incomes],
    expenses: [...source.expenses],
    commitments: source.commitments.map((item) => ({ ...item })),
    subscriptions: source.subscriptions.map((item) => ({ ...item })),
    subscriptionCharges: [...source.subscriptionCharges],
    goals: source.goals.map((item) => ({ ...item })),
    goalContributions: [...source.goalContributions],
    history: [...source.history],
  };
  const wantsAmount = ['one_time_purchase', 'new_subscription', 'recurring_habit', 'weekly_habit', 'extra_income', 'goal_contribution', 'unexpected_expense'].includes(draft.type);
  const wantsTitle = ['one_time_purchase', 'new_subscription', 'recurring_habit', 'weekly_habit', 'extra_income'].includes(draft.type);
  const title = sanitizeText((draft as { title?: unknown }).title, 64);
  const normalizedAmount = wantsAmount ? safePositiveAmount(draft.amount) : 0;
  if (wantsTitle && !title) return { error: 'Add a short name for this decision.' };
  if (wantsAmount && normalizedAmount === null) {
    return { error: 'Enter an amount greater than ₹0 and no more than ₹1,00,00,000.' };
  }
  const amount = normalizedAmount ?? 0;
  const categories: ExpenseCategory[] = ['Food', 'Travel', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other'];
  const category = categories.includes(draft.category) ? draft.category : 'Other';
  const addExpense = (day: number, type: 'discretionary' | 'unexpected', expenseTitle = title) => {
    data.expenses.push({
      id: makeId('expense'), title: sanitizeText(expenseTitle, 64) || 'Planned spend', amount,
      category, day: clamp(Math.round(day), 1, data.profile.totalDays), type,
    });
  };

  switch (draft.type) {
    case 'one_time_purchase': {
      const expenseDay = draft.expenseDay ?? data.currentDay;
      if (!Number.isInteger(expenseDay) || expenseDay < data.currentDay || expenseDay > data.profile.totalDays) {
        return { error: `Choose a day between Day ${data.currentDay} and Day ${data.profile.totalDays}.` };
      }
      addExpense(expenseDay, 'discretionary');
      return { data, message: `${title || 'Purchase'} added to your plan.` };
    }
    case 'unexpected_expense': {
      const expenseDay = draft.expenseDay ?? data.currentDay;
      if (!Number.isInteger(expenseDay) || expenseDay < data.currentDay || expenseDay > data.profile.totalDays) {
        return { error: `Choose a day between Day ${data.currentDay} and Day ${data.profile.totalDays}.` };
      }
      addExpense(expenseDay, 'unexpected', title || 'Unexpected expense');
      if (draft.targetId) {
        const subscription = data.subscriptions.find((item) => item.id === draft.targetId);
        if (subscription?.active) subscription.active = false;
      }
      return { data, message: draft.targetId ? 'Unexpected expense added and a subscription paused to offset the hit.' : 'Unexpected expense added to your plan.' };
    }
    case 'new_subscription': {
      if (data.currentDay >= data.profile.totalDays) return { error: 'There are no days left in this simulation for a new subscription bill.' };
      if (!title) return { error: 'Give the subscription a name.' };
      const billingDay = draft.billingDay ?? data.currentDay + 1;
      if (!Number.isInteger(billingDay) || billingDay <= data.currentDay || billingDay > data.profile.totalDays) {
        return { error: `Choose a first billing day between Day ${data.currentDay + 1} and Day ${data.profile.totalDays}.` };
      }
      data.subscriptions.push({
        id: makeId('subscription'), name: title, amount,
        billingDay, active: true,
      });
      return { data, message: `${title} added. Its bill is now part of your forecast.` };
    }
    case 'recurring_habit': {
      if (!title) return { error: 'Name the recurring habit.' };
      for (let day = data.currentDay; day <= data.profile.totalDays; day += 1) addExpense(day, 'discretionary', `${title} · daily`);
      return { data, message: `${title} is now modelled daily through Day ${data.profile.totalDays}.` };
    }
    case 'weekly_habit': {
      if (!title) return { error: 'Name the weekly habit.' };
      for (let day = data.currentDay; day <= data.profile.totalDays; day += 7) addExpense(day, 'discretionary', `${title} · weekly`);
      return { data, message: `${title} is now modelled every 7 days through Day ${data.profile.totalDays}.` };
    }
    case 'cancel_subscription': {
      const item = data.subscriptions.find((subscription) => subscription.id === draft.targetId);
      if (!item) return { error: 'Choose a subscription to cancel.' };
      if (!item.active) return { error: 'That subscription is already paused.' };
      item.active = false;
      return { data, message: `${item.name} paused. Future charges are removed from the forecast.` };
    }
    case 'extra_income':
      data.incomes.push({ id: makeId('income'), title: title || 'Extra income', amount, day: data.currentDay });
      return { data, message: `${Math.round(amount)} added as income.` };
    case 'goal_contribution': {
      const goal = data.goals.find((item) => item.id === draft.targetId);
      if (!goal) return { error: 'Choose a savings goal.' };
      if (amount > Math.max(0, calculateBalance(data))) return { error: 'That contribution is larger than your current balance.' };
      const alreadySaved = getGoalSavedAmount(goal, data);
      const stillNeeded = Math.max(0, goal.targetAmount - alreadySaved);
      if (amount > stillNeeded) return { error: `This goal needs only ${Math.round(stillNeeded)} more.` };
      data.goalContributions.push({ id: makeId('contribution'), goalId: goal.id, amount, day: data.currentDay });
      return { data, message: `Contribution added to ${goal.title}.` };
    }
    case 'skip_commitment': {
      const item = data.commitments.find((commitment) => commitment.id === draft.targetId);
      if (!item) return { error: 'Choose a commitment to skip.' };
      if (item.paid) return { error: 'That commitment is already paid.' };
      if (item.skipped) return { error: 'That commitment is already skipped.' };
      item.skipped = true;
      return { data, message: `${item.title} marked as skipped in the simulation.` };
    }
    case 'delay_commitment': {
      const item = data.commitments.find((commitment) => commitment.id === draft.targetId);
      if (!item) return { error: 'Choose a commitment to reschedule.' };
      if (item.paid || item.skipped) return { error: 'Only an unpaid commitment can be rescheduled.' };
      const newDueDay = draft.billingDay;
      if (typeof newDueDay !== 'number' || !Number.isInteger(newDueDay) || newDueDay <= data.currentDay || newDueDay > data.profile.totalDays) {
        return { error: `Choose a new due day between Day ${data.currentDay + 1} and Day ${data.profile.totalDays}.` };
      }
      item.dueDay = newDueDay;
      return { data, message: `${item.title} rescheduled to Day ${newDueDay} in the simulation.` };
    }
    default:
      return { error: 'Choose a valid decision type.' };
  }
};

export const getMonthSummary = (state: FinanceData) => {
  const metrics = calculateMetrics(state);
  const expenseByCategory = state.expenses
    .filter((item) => item.day <= state.currentDay)
    .reduce<Record<string, number>>((map, item) => {
      map[item.category] = (map[item.category] ?? 0) + item.amount;
      return map;
    }, {});
  const biggestCategory = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
  const biggestLeak = [...state.expenses].filter((item) => item.day <= state.currentDay).sort((a, b) => b.amount - a.amount)[0];
  return { ...metrics, expenseByCategory, biggestCategory, biggestLeak };
};

export const isPaidByTimeline = (commitment: Commitment, day: number): boolean =>
  commitment.paid && (commitment.autoPaidDay === undefined || commitment.autoPaidDay <= day);
