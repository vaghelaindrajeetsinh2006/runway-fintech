import type { FinanceData, Goal, Profile } from '../types';
import { makeId } from './format';

export const defaultProfile: Profile = {
  name: 'Alex',
  startingBalance: 10000,
  startDay: 1,
  totalDays: 30,
};

export const createDemoData = (name = 'Alex'): FinanceData => {
  const profile = { ...defaultProfile, name: name.trim() || 'Alex' };
  const commitments = [
    { id: 'commit-mess', title: 'Mess / food plan', amount: 2200, dueDay: 3, paid: true, autoPaidDay: 3 },
    { id: 'commit-transport', title: 'Transport pass', amount: 600, dueDay: 5, paid: true, autoPaidDay: 5 },
    { id: 'commit-phone', title: 'Phone recharge', amount: 299, dueDay: 10, paid: false },
    { id: 'commit-study', title: 'Study material', amount: 500, dueDay: 12, paid: false },
  ];
  const subscriptions = [
    { id: 'sub-spotify', name: 'Spotify', amount: 119, billingDay: 4, active: true },
    { id: 'sub-netflix', name: 'Netflix', amount: 199, billingDay: 14, active: true },
    { id: 'sub-youtube', name: 'YouTube Premium', amount: 129, billingDay: 18, active: true },
    { id: 'sub-gym', name: 'Gym membership', amount: 499, billingDay: 22, active: true },
  ];
  const goals: Goal[] = [
    { id: 'goal-goa', title: 'Goa trip', targetAmount: 3000, savedAmount: 900, deadlineDay: 30, monthlyContribution: 700, priority: 'High' },
    { id: 'goal-emergency', title: 'Emergency fund', targetAmount: 1500, savedAmount: 500, deadlineDay: 30, monthlyContribution: 500, priority: 'High' },
  ];
  return {
    profile,
    currentDay: 7,
    incomes: [
      { id: 'income-side', title: 'Design gig', amount: 700, day: 6, recurring: false },
    ],
    expenses: [
      { id: 'exp-1', title: 'Groceries & breakfast', amount: 140, category: 'Food', day: 1, type: 'discretionary' },
      { id: 'exp-2', title: 'Coffee + snack', amount: 90, category: 'Food', day: 2, type: 'discretionary' },
      { id: 'exp-3', title: 'Movie ticket', amount: 180, category: 'Entertainment', day: 2, type: 'discretionary' },
      { id: 'exp-4', title: 'Ride share', amount: 80, category: 'Travel', day: 3, type: 'discretionary' },
      { id: 'exp-5', title: 'New tee', amount: 299, category: 'Shopping', day: 4, type: 'discretionary' },
      { id: 'exp-6', title: 'Lunch out', amount: 120, category: 'Food', day: 5, type: 'discretionary' },
      { id: 'exp-7', title: 'Late-night delivery', amount: 180, category: 'Food', day: 6, type: 'discretionary' },
      { id: 'exp-8', title: 'Cab home', amount: 80, category: 'Travel', day: 6, type: 'discretionary' },
      { id: 'exp-9', title: 'Weekend hangout', amount: 260, category: 'Entertainment', day: 7, type: 'discretionary' },
      { id: 'exp-10', title: 'Iced coffee', amount: 70, category: 'Food', day: 7, type: 'discretionary' },
    ],
    commitments,
    subscriptions,
    subscriptionCharges: [
      { id: 'charge-spotify-4', subscriptionId: 'sub-spotify', day: 4, amount: 119 },
    ],
    goals,
    goalContributions: [],
    history: [],
  };
};

export const createEmptyData = (name = 'Alex'): FinanceData => ({
  profile: { ...defaultProfile, name: name.trim() || 'Alex' },
  currentDay: 1,
  incomes: [],
  expenses: [],
  commitments: [],
  subscriptions: [],
  subscriptionCharges: [],
  goals: [],
  goalContributions: [],
  history: [],
});
