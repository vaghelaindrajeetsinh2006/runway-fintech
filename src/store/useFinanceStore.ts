import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type {
  Commitment, DecisionDraft, ExpenseEntry,
  FinanceData, FinanceSnapshot, Goal, GoalPriority, IncomeEntry, Profile,
  Subscription, UndoEntry,
} from '../types';
import { applyDecisionDraft, calculateBalance, calculateMetrics } from '../lib/finance';
import { createDemoData, createEmptyData } from '../lib/seed';
import { makeId } from '../lib/format';

type Theme = 'dark' | 'light';

type FinancePatch = Partial<FinanceStore>;

interface FinanceStore extends FinanceData {
  theme: Theme;
  onboardingComplete: boolean;
  undoEntry: UndoEntry | null;
  toastMessage: string | null;
  setTheme: (theme: Theme) => void;
  completeOnboarding: (options: { name: string; mode: 'demo' | 'empty'; firstGoalTitle?: string }) => void;
  skipOnboarding: () => void;
  resetDemoData: () => void;
  updateProfile: (profile: Partial<Profile>) => void;
  addExpense: (input: Omit<ExpenseEntry, 'id'>) => void;
  updateExpense: (id: string, patch: Partial<Omit<ExpenseEntry, 'id'>>) => void;
  deleteExpense: (id: string) => void;
  addIncome: (input: Omit<IncomeEntry, 'id'>) => void;
  updateIncome: (id: string, patch: Partial<Omit<IncomeEntry, 'id'>>) => void;
  deleteIncome: (id: string) => void;
  addCommitment: (input: Omit<Commitment, 'id' | 'paid' | 'skipped' | 'autoPaidDay'>) => void;
  updateCommitment: (id: string, patch: Partial<Omit<Commitment, 'id'>>) => void;
  deleteCommitment: (id: string) => void;
  addSubscription: (input: Omit<Subscription, 'id'>) => void;
  updateSubscription: (id: string, patch: Partial<Omit<Subscription, 'id'>>) => void;
  toggleSubscription: (id: string) => void;
  deleteSubscription: (id: string) => void;
  addGoal: (input: Omit<Goal, 'id' | 'savedAmount'> & { savedAmount?: number }) => void;
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (goalId: string, amount: number) => { error?: string };
  setCurrentDay: (day: number) => void;
  advanceDays: (amount: number) => void;
  applyDecision: (draft: DecisionDraft) => { error?: string; message?: string };
  undoLastAction: () => void;
  clearToast: () => void;
}

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(name) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(name, value);
    } catch {
      // Storage can be disabled or full; the current session remains usable.
    }
  },
  removeItem: (name) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(name);
    } catch {
      // Ignore blocked storage.
    }
  },
};

const preferredTheme = (): Theme => {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

const toFinanceData = (state: FinanceStore | FinanceSnapshot): FinanceData => ({
  profile: state.profile,
  currentDay: state.currentDay,
  incomes: state.incomes,
  expenses: state.expenses,
  commitments: state.commitments,
  subscriptions: state.subscriptions,
  subscriptionCharges: state.subscriptionCharges,
  goals: state.goals,
  goalContributions: state.goalContributions,
  history: state.history,
});

const toSnapshot = (state: FinanceStore): FinanceSnapshot => ({
  ...toFinanceData(state),
  onboardingComplete: state.onboardingComplete,
});

const dailySpend = (data: FinanceData, day: number): number => data.expenses
  .filter((item) => item.day === day)
  .reduce((total, item) => total + item.amount, 0);

const makeHistory = (data: FinanceData): FinanceData['history'] => {
  const snapshots: FinanceData['history'] = [];
  for (let day = 1; day <= data.currentDay; day += 1) {
    const timeline = { ...data, currentDay: day, history: [] };
    const balance = calculateBalance(timeline, day);
    const metrics = calculateMetrics(timeline);
    snapshots.push({ day, balance, spend: dailySpend(data, day), allowance: metrics.safeDailyAllowance });
  }
  return snapshots;
};

const dataWithHistory = (data: FinanceData): FinanceData => ({ ...data, history: makeHistory(data) });

export const useFinanceStore = create<FinanceStore>()(persist((set, get) => {
  const initial = dataWithHistory(createDemoData());

  const recordCurrentDay = () => {
    const state = get();
    const data = toFinanceData(state);
    const metrics = calculateMetrics(data);
    const item = {
      day: state.currentDay,
      balance: calculateBalance(data),
      spend: dailySpend(data, state.currentDay),
      allowance: metrics.safeDailyAllowance,
    };
    set({ history: [...state.history.filter((snapshot) => snapshot.day !== state.currentDay), item].sort((a, b) => a.day - b.day) });
  };

  const commit = (patcher: (state: FinanceStore) => FinancePatch, message: string, withUndo = true) => {
    const before = toSnapshot(get());
    set((state) => {
      const patch = patcher(state);
      return {
        ...patch,
        ...(withUndo ? { undoEntry: { snapshot: before, message } } : {}),
        toastMessage: patch.toastMessage ?? message,
      };
    });
    recordCurrentDay();
  };

  const stateFrom = (data: FinanceData): FinancePatch => ({
    profile: data.profile,
    currentDay: data.currentDay,
    incomes: data.incomes,
    expenses: data.expenses,
    commitments: data.commitments,
    subscriptions: data.subscriptions,
    subscriptionCharges: data.subscriptionCharges,
    goals: data.goals,
    goalContributions: data.goalContributions,
    history: data.history,
  });

  return {
    ...initial,
    theme: preferredTheme(),
    onboardingComplete: false,
    undoEntry: null,
    toastMessage: null,

    setTheme: (theme) => set({ theme }),

    completeOnboarding: ({ name, mode, firstGoalTitle }) => {
      const safeName = name.trim() || 'Alex';
      commit((state) => {
        const next = mode === 'demo' ? createDemoData(safeName) : createEmptyData(safeName);
        if (firstGoalTitle?.trim()) {
          next.goals.push({
            id: makeId('goal'), title: firstGoalTitle.trim(), targetAmount: 2000, savedAmount: 0,
            deadlineDay: 30, monthlyContribution: 500, priority: 'Medium',
          });
        }
        return { ...stateFrom(dataWithHistory(next)), onboardingComplete: true };
      }, 'Your Runway is ready. Make every rupee count.');
    },

    skipOnboarding: () => commit(() => ({ onboardingComplete: true }), 'Welcome to Runway.', false),

    resetDemoData: () => {
      const name = get().profile.name || 'Alex';
      commit((state) => ({ ...stateFrom(dataWithHistory(createDemoData(name))), onboardingComplete: true, theme: state.theme }), 'Demo data restored. Your previous data can be undone.');
    },

    updateProfile: (patch) => commit((state) => ({ profile: { ...state.profile, ...patch } }), 'Profile updated.'),

    addExpense: (input) => commit((state) => ({ expenses: [...state.expenses, { ...input, id: makeId('expense') }] }), `${input.title} added.`),
    updateExpense: (id, patch) => commit((state) => ({ expenses: state.expenses.map((item) => item.id === id ? { ...item, ...patch } : item) }), 'Transaction updated.'),
    deleteExpense: (id) => commit((state) => ({ expenses: state.expenses.filter((item) => item.id !== id) }), 'Transaction deleted.'),

    addIncome: (input) => commit((state) => ({ incomes: [...state.incomes, { ...input, id: makeId('income') }] }), `${input.title} added as income.`),
    updateIncome: (id, patch) => commit((state) => ({ incomes: state.incomes.map((item) => item.id === id ? { ...item, ...patch } : item) }), 'Income updated.'),
    deleteIncome: (id) => commit((state) => ({ incomes: state.incomes.filter((item) => item.id !== id) }), 'Income deleted.'),

    addCommitment: (input) => commit((state) => ({ commitments: [...state.commitments, { ...input, id: makeId('commitment'), paid: false, skipped: false }] }), `${input.title} added to commitments.`),
    updateCommitment: (id, patch) => commit((state) => ({ commitments: state.commitments.map((item) => item.id === id ? { ...item, ...patch } : item) }), 'Commitment updated.'),
    deleteCommitment: (id) => commit((state) => ({ commitments: state.commitments.filter((item) => item.id !== id) }), 'Commitment deleted.'),

    addSubscription: (input) => commit((state) => ({ subscriptions: [...state.subscriptions, { ...input, id: makeId('subscription') }] }), `${input.name} added.`),
    updateSubscription: (id, patch) => commit((state) => ({ subscriptions: state.subscriptions.map((item) => item.id === id ? { ...item, ...patch } : item) }), 'Subscription updated.'),
    toggleSubscription: (id) => {
      const item = get().subscriptions.find((subscription) => subscription.id === id);
      if (!item) return;
      commit((state) => ({ subscriptions: state.subscriptions.map((subscription) => subscription.id === id ? { ...subscription, active: !subscription.active } : subscription) }), `${item.name} ${item.active ? 'paused' : 'resumed'}.`);
    },
    deleteSubscription: (id) => commit((state) => ({ subscriptions: state.subscriptions.filter((item) => item.id !== id) }), 'Subscription removed. Past charges remain in your history.'),

    addGoal: (input) => commit((state) => ({ goals: [...state.goals, { ...input, id: makeId('goal'), savedAmount: input.savedAmount ?? 0 }] }), `${input.title} goal created.`),
    updateGoal: (id, patch) => commit((state) => ({ goals: state.goals.map((item) => item.id === id ? { ...item, ...patch } : item) }), 'Goal updated.'),
    deleteGoal: (id) => commit((state) => ({
      goals: state.goals.filter((item) => item.id !== id),
      goalContributions: state.goalContributions.filter((item) => item.goalId !== id),
    }), 'Goal deleted. Its in-runway contributions were returned to your balance.'),
    contributeToGoal: (goalId, amount) => {
      const state = get();
      if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter a valid contribution amount.' };
      if (amount > Math.max(0, calculateBalance(toFinanceData(state)))) return { error: 'Contribution is larger than your available balance.' };
      const goal = state.goals.find((item) => item.id === goalId);
      if (!goal) return { error: 'Choose a goal first.' };
      commit((current) => ({ goalContributions: [...current.goalContributions, { id: makeId('contribution'), goalId, amount, day: current.currentDay }] }), `Moved ${Math.round(amount)} into ${goal.title}.`);
      return {};
    },

    setCurrentDay: (requestedDay) => {
      const target = Math.max(1, Math.min(30, Math.round(requestedDay)));
      const stateNow = get();
      if (target === stateNow.currentDay) return;
      commit((state) => {
        let data = toFinanceData(state);
        let commitments = data.commitments.map((item) => {
          if (item.autoPaidDay !== undefined && item.autoPaidDay > target) return { ...item, paid: false, autoPaidDay: undefined };
          return { ...item };
        });
        let charges = data.subscriptionCharges.filter((charge) => charge.day <= target);
        let history = data.history.filter((snapshot) => snapshot.day <= target);
        let notifications: string[] = [];
        if (target > state.currentDay) {
          for (let day = state.currentDay + 1; day <= target; day += 1) {
            commitments = commitments.map((item) => {
              if (!item.paid && !item.skipped && item.dueDay === day) {
                notifications.push(`${item.title} · ${Math.round(item.amount)} charged on Day ${day}.`);
                return { ...item, paid: true, autoPaidDay: day };
              }
              return item;
            });
            const currentCharges = data.subscriptions.filter((subscription) =>
              subscription.active && subscription.billingDay === day &&
              !charges.some((charge) => charge.subscriptionId === subscription.id && charge.day === day),
            );
            for (const subscription of currentCharges) {
              charges.push({ id: makeId('charge'), subscriptionId: subscription.id, day, amount: subscription.amount });
              notifications.push(`${subscription.name} · ${Math.round(subscription.amount)} charged on Day ${day}.`);
            }
            const timeline: FinanceData = { ...data, currentDay: day, commitments, subscriptionCharges: charges, history };
            const snapshot = {
              day,
              balance: calculateBalance(timeline, day),
              spend: dailySpend(timeline, day),
              allowance: calculateMetrics(timeline).safeDailyAllowance,
            };
            history = [...history.filter((entry) => entry.day !== day), snapshot].sort((a, b) => a.day - b.day);
          }
        }
        const next: FinanceData = { ...data, currentDay: target, commitments, subscriptionCharges: charges, history };
        return {
          ...stateFrom(next),
          toastMessage: notifications.length ? notifications.slice(0, 2).join(' ') : `Timeline moved to Day ${target}.`,
        };
      }, `Timeline moved to Day ${target}.`);
    },

    advanceDays: (amount) => get().setCurrentDay(Math.min(get().profile.totalDays, get().currentDay + Math.max(1, amount))),

    applyDecision: (draft: DecisionDraft) => {
      const state = get();
      const result = (awaitlessApply)(toFinanceData(state), draft);
      if (result.error || !result.data) return { error: result.error || 'That decision could not be applied.' };
      commit(() => stateFrom(result.data as FinanceData), result.message || 'Decision applied.');
      return { message: result.message };
    },

    undoLastAction: () => {
      const state = get();
      if (!state.undoEntry) return;
      const snapshot = state.undoEntry.snapshot;
      set({ ...snapshot, undoEntry: null, toastMessage: 'Undone — your previous state is back.' });
      recordCurrentDay();
    },

    clearToast: () => set({ toastMessage: null }),
  };
}, {
  name: 'runway-finance-v1',
  version: 1,
  storage: createJSONStorage(() => safeStorage),
  partialize: (state) => ({
    profile: state.profile,
    currentDay: state.currentDay,
    incomes: state.incomes,
    expenses: state.expenses,
    commitments: state.commitments,
    subscriptions: state.subscriptions,
    subscriptionCharges: state.subscriptionCharges,
    goals: state.goals,
    goalContributions: state.goalContributions,
    history: state.history,
    theme: state.theme,
    onboardingComplete: state.onboardingComplete,
  }),
  migrate: (persistedState) => {
    const saved = persistedState as Partial<FinanceStore> | undefined;
    const data = dataWithHistory({
      ...createDemoData(saved?.profile?.name || 'Alex'),
      ...saved,
      profile: saved?.profile ?? createDemoData().profile,
      currentDay: saved?.currentDay ?? 7,
      incomes: saved?.incomes ?? createDemoData().incomes,
      expenses: saved?.expenses ?? createDemoData().expenses,
      commitments: saved?.commitments ?? createDemoData().commitments,
      subscriptions: saved?.subscriptions ?? createDemoData().subscriptions,
      subscriptionCharges: saved?.subscriptionCharges ?? createDemoData().subscriptionCharges,
      goals: saved?.goals ?? createDemoData().goals,
      goalContributions: saved?.goalContributions ?? [],
      history: saved?.history ?? [],
    } as FinanceData);
    return {
      ...data,
      theme: saved?.theme ?? preferredTheme(),
      onboardingComplete: saved?.onboardingComplete ?? false,
      undoEntry: null,
      toastMessage: null,
    } as FinanceStore;
  },
}));

// Keep pure decision modelling separated from global-store mutations.
const awaitlessApply = applyDecisionDraft;

export const selectFinanceData = (state: FinanceStore): FinanceData => toFinanceData(state);
