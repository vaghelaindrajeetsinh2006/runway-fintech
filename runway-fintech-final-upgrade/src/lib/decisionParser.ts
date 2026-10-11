import type { DecisionDraft, ExpenseCategory, FinanceData } from '../types';
import { clamp, safePositiveAmount, sanitizeText } from './format';

export interface InterpretedDecision {
  draft: Partial<DecisionDraft> & Pick<DecisionDraft, 'type' | 'category'>;
  explanation: string;
}

function parseAmount(text: string): number | null {
  const patterns = [
    /(?:₹\s*|\bINR\s*|\bRs\.?\s*)(\d[\d,]*(?:\.\d{1,2})?)\s*(k|thousand)?\b/i,
    /\b(\d[\d,]*(?:\.\d{1,2})?)\s*(k|thousand|rupees?|rs\.?)(?:\b|$)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const number = Number(match[1].replace(/,/g, ''));
    const multiplier = match[2] && /^(k|thousand)$/i.test(match[2]) ? 1000 : 1;
    const safe = safePositiveAmount(number * multiplier);
    if (safe !== null) return safe;
  }
  return null;
}

function detectCategory(text: string): ExpenseCategory {
  const normalized = text.toLowerCase();
  if (/food|lunch|dinner|breakfast|coffee|tea|snack|grocer|restaurant|pizza|delivery/.test(normalized)) return 'Food';
  if (/travel|cab|taxi|ride|bus|train|fuel|petrol|bike|puncture|metro|transport/.test(normalized)) return 'Travel';
  if (/shopping|shoe|sneaker|clothes|shirt|tee|purchase|buy|dress|bag/.test(normalized)) return 'Shopping';
  if (/movie|concert|game|party|birthday|stream|netflix|spotify|youtube|entertainment/.test(normalized)) return 'Entertainment';
  if (/bill|rent|recharge|electric|water|subscription|membership|wifi/.test(normalized)) return 'Bills';
  if (/health|doctor|medical|medicine|hospital|repair screen/.test(normalized)) return 'Health';
  if (/study|book|course|college|education|exam|material|tuition/.test(normalized)) return 'Education';
  return 'Other';
}

function usefulTitle(text: string, fallback: string): string {
  const cleaned = text
    .replace(/(?:₹\s*|\bINR\s*|\bRs\.?\s*)\d[\d,]*(?:\.\d{1,2})?\s*(?:k|thousand)?\b/gi, ' ')
    .replace(/\b\d[\d,]*(?:\.\d{1,2})?\s*(?:k|thousand|rupees?|rs\.?)\b/gi, ' ')
    .replace(/\b(i\s*(?:want|would like)\s*to|please|can you|simulate|model|what if|i need to|i plan to|i will|i want|buy|purchase|spend|spending|add|new|a|an|the|for|on|to|my|some|daily|every day|each day|weekly|every week|each week|subscription|subscribe|cancel|pause|stop|save|saving|contribute|put aside|put away|earn|received|receive|income|freelance|refund|unexpected|surprise|expense|bill|commitment)\b/gi, ' ')
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitizeText(cleaned, 64) || fallback;
}

/**
 * Local, deterministic intent interpreter for the Decision Lab. It does not call an API
 * and only prepares an editable draft; it never mutates finance state itself.
 */
export function interpretDecisionText(rawText: string, state: FinanceData): { result?: InterpretedDecision; error?: string } {
  const text = sanitizeText(rawText, 180);
  if (!text) return { error: 'Describe a money decision first, for example “buy sneakers for ₹1,800”.' };

  const normalized = text.toLowerCase();
  const amount = parseAmount(text);
  const namedSubscription = state.subscriptions.find((item) => normalized.includes(item.name.toLowerCase()));
  const namedGoal = state.goals.find((item) => normalized.includes(item.title.toLowerCase()));
  const namedCommitment = state.commitments.find((item) => normalized.includes(item.title.toLowerCase()));
  const activeSubscription = namedSubscription?.active
    ? namedSubscription
    : state.subscriptions.filter((item) => item.active && item.billingDay > state.currentDay).sort((a, b) => b.amount - a.amount)[0];
  const openCommitment = namedCommitment && !namedCommitment.paid && !namedCommitment.skipped
    ? namedCommitment
    : state.commitments.find((item) => !item.paid && !item.skipped);

  let type: DecisionDraft['type'] = 'one_time_purchase';
  let targetId: string | undefined;
  let fallbackTitle = 'Planned purchase';
  let explanation = 'Interpreted as a one-time purchase. Review the fields and projected impact before applying.';

  if (/\b(cancel|pause|stop|drop|turn off)\b/.test(normalized) && (namedSubscription || /subscription|membership|netflix|spotify|youtube|gym/.test(normalized))) {
    if (!activeSubscription) return { error: 'No active subscription matches that request. Select one in the decision form.' };
    type = 'cancel_subscription'; targetId = activeSubscription.id; fallbackTitle = activeSubscription.name;
    explanation = `Interpreted as pausing ${activeSubscription.name}. Only a draft is prepared; nothing changes until Apply.`;
  } else if (/\b(reschedule|postpone|delay|move.*(bill|payment))\b/.test(normalized)) {
    if (!openCommitment) return { error: 'There is no unpaid commitment available to reschedule.' };
    type = 'delay_commitment'; targetId = openCommitment.id; fallbackTitle = openCommitment.title;
    explanation = `Interpreted as rescheduling ${openCommitment.title}. The bill stays in the plan.`;
  } else if (/\b(skip|avoid paying|miss)\b/.test(normalized) && (namedCommitment || /bill|commitment|rent|fee|payment/.test(normalized))) {
    if (!openCommitment) return { error: 'There is no unpaid commitment available to skip in this simulation.' };
    type = 'skip_commitment'; targetId = openCommitment.id; fallbackTitle = openCommitment.title;
    explanation = `Interpreted as skipping ${openCommitment.title}. Review the trade-off; the obligation is only changed in the preview.`;
  } else if (/\b(save|saving|contribute|put aside|put away)\b/.test(normalized) && (namedGoal || state.goals.length > 0)) {
    const goal = namedGoal ?? state.goals[0];
    type = 'goal_contribution'; targetId = goal?.id; fallbackTitle = goal?.title ?? 'Savings contribution';
    explanation = `Interpreted as a contribution to ${goal?.title ?? 'a savings goal'}. Check the available balance and remaining target.`;
  } else if (/\b(income|earn|earned|freelance|refund|cashback|received|receive|got paid|payment arrives)\b/.test(normalized)) {
    type = 'extra_income'; fallbackTitle = 'Extra income';
    explanation = 'Interpreted as additional income. Check the amount and preview before applying.';
  } else if (/\b(daily|every day|each day|per day)\b/.test(normalized)) {
    type = 'recurring_habit'; fallbackTitle = 'Daily habit';
    explanation = 'Interpreted as a repeating daily expense through the rest of the simulation.';
  } else if (/\b(weekly|every week|each week|per week)\b/.test(normalized)) {
    type = 'weekly_habit'; fallbackTitle = 'Weekly habit';
    explanation = 'Interpreted as a repeating weekly expense. Confirm the amount and preview.';
  } else if (/unexpected|surprise|repair|medical|puncture|accident|emergency expense|broken screen/.test(normalized)) {
    type = 'unexpected_expense'; fallbackTitle = 'Unexpected expense';
    explanation = 'Interpreted as an unexpected expense. Consider the pause-or-delay alternatives before applying.';
  } else if (/\b(subscription|subscribe|streaming app|membership)\b/.test(normalized)) {
    type = 'new_subscription'; fallbackTitle = 'New subscription';
    explanation = 'Interpreted as a new subscription with a future billing day.';
  }

  const needsAmount = ['one_time_purchase', 'new_subscription', 'recurring_habit', 'weekly_habit', 'extra_income', 'goal_contribution', 'unexpected_expense'].includes(type);
  if (needsAmount && amount === null) return { error: 'I understood the type of decision but could not find a rupee amount. Add one, such as ₹1,800.' };

  let title = fallbackTitle;
  if (type === 'cancel_subscription' && activeSubscription) title = activeSubscription.name;
  else if ((type === 'skip_commitment' || type === 'delay_commitment') && openCommitment) title = openCommitment.title;
  else if (type === 'goal_contribution' && (namedGoal || state.goals[0])) title = (namedGoal ?? state.goals[0]).title;
  else title = usefulTitle(text, fallbackTitle);

  const draft: Partial<DecisionDraft> & Pick<DecisionDraft, 'type' | 'category'> = {
    type,
    title,
    amount: ['cancel_subscription', 'skip_commitment', 'delay_commitment'].includes(type) ? undefined : amount ?? undefined,
    category: detectCategory(text),
    ...(targetId ? { targetId } : {}),
  };

  const explicitDay = normalized.match(/\bday\s*(\d{1,2})\b/);
  const inDays = normalized.match(/\bin\s*(\d{1,2})\s*days?\b/);
  const day = explicitDay ? Number(explicitDay[1]) : inDays ? state.currentDay + Number(inDays[1]) : /\btomorrow\b/.test(normalized) ? state.currentDay + 1 : undefined;
  if (day !== undefined && Number.isInteger(day)) {
    const clampedDay = clamp(day, state.currentDay, state.profile.totalDays);
    if (type === 'new_subscription') draft.billingDay = Math.max(state.currentDay + 1, clampedDay);
    else if (type === 'one_time_purchase' || type === 'unexpected_expense') draft.expenseDay = clampedDay;
    else if (type === 'delay_commitment') draft.billingDay = Math.max(state.currentDay + 1, clampedDay);
  }

  return { result: { draft, explanation } };
}
