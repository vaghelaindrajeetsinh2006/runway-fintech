const test = require('node:test');
const assert = require('node:assert/strict');
const {
  applyDecisionDraft,
  calculateBalance,
  calculateMetrics,
  getGoalSavedAmount,
  getGoalStatus,
} = require('../.test-build/lib/finance.js');
const { createDemoData } = require('../.test-build/lib/seed.js');
const { sanitizeFinanceData } = require('../.test-build/lib/sanitize.js');
const { sanitizeText } = require('../.test-build/lib/format.js');

const createDemo = () => createDemoData('Test user');

test('demo data has a reproducible day-7 balance', () => {
  const data = createDemo();
  assert.equal(calculateBalance(data), 6282);
});

test('metrics are bounded, non-negative where required, and cover current day through day 30', () => {
  const data = createDemo();
  const metrics = calculateMetrics(data);
  assert.ok(metrics.healthScore >= 0 && metrics.healthScore <= 100);
  assert.ok(metrics.safeDailyAllowance >= 0);
  assert.equal(metrics.forecast.length, data.profile.totalDays - data.currentDay + 1);
  assert.equal(metrics.projectedEndBalance, metrics.forecast.at(-1).balance);
  assert.ok(metrics.forecast.every((point) => Number.isFinite(point.balance)));
});

test('purchase preview is pure and changes the simulated balance only in the draft', () => {
  const data = createDemo();
  const before = calculateBalance(data);
  const result = applyDecisionDraft(data, {
    type: 'one_time_purchase', title: 'Sneakers', amount: 1800, category: 'Shopping',
  });
  assert.equal(result.error, undefined);
  assert.ok(result.data);
  assert.equal(calculateBalance(data), before);
  assert.equal(calculateBalance(result.data), before - 1800);
});

test('invalid amounts and invalid future dates are rejected by the decision model', () => {
  const data = createDemo();
  assert.ok(applyDecisionDraft(data, {
    type: 'one_time_purchase', title: 'Invalid', amount: Number.NaN, category: 'Other',
  }).error);
  assert.ok(applyDecisionDraft(data, {
    type: 'new_subscription', title: 'Invalid date', amount: 100, category: 'Other', billingDay: data.currentDay,
  }).error);
});

test('a future subscription cancellation preserves current balance and reduces reserved obligations', () => {
  const data = createDemo();
  const beforeMetrics = calculateMetrics(data);
  const result = applyDecisionDraft(data, {
    type: 'cancel_subscription', title: 'Netflix', amount: 0, category: 'Other', targetId: 'sub-netflix',
  });
  assert.ok(result.data);
  const afterMetrics = calculateMetrics(result.data);
  assert.equal(afterMetrics.balance, beforeMetrics.balance);
  assert.equal(afterMetrics.upcomingObligations, beforeMetrics.upcomingObligations - 199);
  assert.ok(Math.abs(afterMetrics.projectedEndBalance - (beforeMetrics.projectedEndBalance + 199)) < 1e-9);
});

test('goal contribution reduces liquid balance, increases goal progress, and cannot overfund a goal', () => {
  const data = createDemo();
  const goal = data.goals[0];
  const beforeBalance = calculateBalance(data);
  const beforeSaved = getGoalSavedAmount(goal, data);
  const result = applyDecisionDraft(data, {
    type: 'goal_contribution', title: 'Save for Goa', amount: 300, category: 'Other', targetId: goal.id,
  });
  assert.ok(result.data);
  assert.equal(calculateBalance(result.data), beforeBalance - 300);
  assert.equal(getGoalSavedAmount(result.data.goals[0], result.data), beforeSaved + 300);
  const tooMuch = applyDecisionDraft(data, {
    type: 'goal_contribution', title: 'Overfund', amount: goal.targetAmount, category: 'Other', targetId: goal.id,
  });
  assert.match(tooMuch.error, /needs only/i);
});

test('weekly habit alternative actually repeats once every seven days', () => {
  const data = createDemo();
  const result = applyDecisionDraft(data, {
    type: 'weekly_habit', title: 'Weekly treat', amount: 150, category: 'Entertainment',
  });
  assert.ok(result.data);
  assert.deepEqual(
    result.data.expenses.filter((entry) => entry.title.endsWith(' · weekly')).map((entry) => entry.day),
    [7, 14, 21, 28],
  );
});

test('commitment reschedule keeps the obligation but moves its forecast date', () => {
  const data = createDemo();
  const result = applyDecisionDraft(data, {
    type: 'delay_commitment', title: 'Phone recharge', amount: 0, category: 'Other', targetId: 'commit-phone', billingDay: 13,
  });
  assert.ok(result.data);
  assert.equal(result.data.commitments.find((item) => item.id === 'commit-phone').dueDay, 13);
  assert.equal(calculateMetrics(result.data).upcomingObligations, calculateMetrics(data).upcomingObligations);
});


test('goal feasibility reacts to a purchase that leaves too little cash after bills', () => {
  const data = createDemo();
  const goal = data.goals[0];
  assert.equal(getGoalStatus(goal, data), 'On track');
  const after = applyDecisionDraft(data, {
    type: 'one_time_purchase', title: 'Large purchase', amount: 5000, category: 'Shopping',
  });
  assert.ok(after.data);
  assert.equal(getGoalStatus(after.data.goals[0], after.data), 'Off track');
  assert.equal(getGoalStatus(goal, data), 'On track');
});

test('unexpected expense with an offset pauses the selected active subscription only in the draft', () => {
  const data = createDemo();
  const result = applyDecisionDraft(data, {
    type: 'unexpected_expense', title: 'Screen repair', amount: 900, category: 'Health', targetId: 'sub-netflix',
  });
  assert.ok(result.data);
  assert.equal(data.subscriptions.find((item) => item.id === 'sub-netflix').active, true);
  assert.equal(result.data.subscriptions.find((item) => item.id === 'sub-netflix').active, false);
  assert.equal(calculateBalance(result.data), calculateBalance(data) - 900);
});

test('Day 30 is a stable terminal state with one finite forecast point', () => {
  const data = createDemo();
  data.currentDay = 30;
  const metrics = calculateMetrics(data);
  assert.equal(metrics.daysLeft, 1);
  assert.equal(metrics.forecast.length, 1);
  assert.equal(metrics.forecast[0].day, 30);
  assert.ok(Number.isFinite(metrics.safeDailyAllowance));
  assert.ok(Number.isFinite(metrics.healthScore));
});

test('an empty plan remains computable without goals, subscriptions, commitments, or transactions', () => {
  const data = createDemo();
  data.currentDay = 1;
  data.incomes = [];
  data.expenses = [];
  data.commitments = [];
  data.subscriptions = [];
  data.subscriptionCharges = [];
  data.goals = [];
  data.goalContributions = [];
  data.history = [];
  const metrics = calculateMetrics(data);
  assert.equal(metrics.balance, 10000);
  assert.equal(metrics.upcomingObligations, 0);
  assert.equal(metrics.forecast.length, 30);
  assert.ok(metrics.forecast.every((point) => Number.isFinite(point.balance)));
});

test('local-storage data sanitization drops invalid numeric entries and bounds the current day', () => {
  const fallback = createDemo();
  const cleaned = sanitizeFinanceData({
    profile: { name: '<script>bad</script>', startingBalance: -12 },
    currentDay: 999,
    incomes: [{ id: 'bad', title: 'bad', amount: Number.NaN, day: 2 }],
    expenses: [], commitments: [], subscriptions: [], subscriptionCharges: [], goals: [], goalContributions: [], history: [],
  }, fallback);
  assert.equal(cleaned.profile.startingBalance, fallback.profile.startingBalance);
  assert.equal(cleaned.currentDay, fallback.currentDay);
  assert.deepEqual(cleaned.incomes, []);
  assert.deepEqual(cleaned.expenses, []);
  assert.equal(cleaned.profile.name.length <= 32, true);
});


test('persisted duplicate ids are normalized so list updates and React keys remain reliable', () => {
  const fallback = createDemo();
  const cleaned = sanitizeFinanceData({
    ...fallback,
    expenses: [
      { id: 'duplicate', title: 'First', amount: 10, category: 'Food', day: 1, type: 'discretionary' },
      { id: 'duplicate', title: 'Second', amount: 20, category: 'Food', day: 2, type: 'discretionary' },
    ],
  }, fallback);
  assert.equal(cleaned.expenses.length, 2);
  assert.notEqual(cleaned.expenses[0].id, cleaned.expenses[1].id);
});

test('text sanitizer strips control characters and enforces a maximum length', () => {
  assert.equal(sanitizeText('  hello\u0000   world  ', 20), 'hello world');
  assert.equal(sanitizeText('0123456789', 5), '01234');
});


test('sub-cent positive amounts are rejected after currency rounding', () => {
  const { safePositiveAmount } = require('../.test-build/lib/format.js');
  assert.equal(safePositiveAmount(0.001), null);
  assert.equal(safePositiveAmount(0.01), 0.01);
});
