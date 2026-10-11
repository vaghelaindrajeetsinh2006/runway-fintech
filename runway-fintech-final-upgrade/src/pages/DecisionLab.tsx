import { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, CircleHelp, FlaskConical, Lightbulb, ShieldCheck, Sparkles, Target, TrendingDown, XCircle, Zap } from 'lucide-react';
import { Badge, Button, Card, Field, InlineNotice, Input, PageHeading, ProgressBar, Select } from '../components/ui';
import { DecisionCompareChart } from '../components/Charts';
import { applyDecisionDraft, calculateMetrics, getGoalSavedAmount, getGoalStatus } from '../lib/finance';
import { inr } from '../lib/format';
import { selectFinanceData, useFinanceStore } from '../store/useFinanceStore';
import { interpretDecisionText } from '../lib/decisionParser';
import type { DecisionDraft, DecisionType, ExpenseCategory, FinanceData, FinanceMetrics } from '../types';

const decisionOptions: Array<{ value: DecisionType; label: string; description: string }> = [
  { value: 'one_time_purchase', label: 'One-time purchase', description: 'Buy something once and see the ripple effect.' },
  { value: 'unexpected_expense', label: 'Unexpected expense', description: 'Test a surprise bill before choosing how to absorb it.' },
  { value: 'new_subscription', label: 'New subscription', description: 'Add a recurring bill to your upcoming obligations.' },
  { value: 'recurring_habit', label: 'Daily habit', description: 'Model a daily habit like ₹150 coffee.' },
  { value: 'weekly_habit', label: 'Weekly ritual', description: 'Keep a smaller repeat spend once every seven days.' },
  { value: 'cancel_subscription', label: 'Cancel a subscription', description: 'Free a future charge before it bills.' },
  { value: 'extra_income', label: 'Extra income', description: 'Add a side-gig payment or surprise inflow.' },
  { value: 'goal_contribution', label: 'Goal contribution', description: 'Move spendable cash into a savings goal.' },
  { value: 'skip_commitment', label: 'Skip a commitment', description: 'Model what happens if you don’t pay a bill.' },
  { value: 'delay_commitment', label: 'Reschedule a bill', description: 'Compare a later due date without removing the bill.' },
];

const sampleFor = (type: DecisionType): { title: string; amount: string } => {
  switch (type) {
    case 'one_time_purchase': return { title: 'New sneakers', amount: '1800' };
    case 'unexpected_expense': return { title: 'Unexpected expense', amount: '900' };
    case 'new_subscription': return { title: 'New streaming app', amount: '249' };
    case 'recurring_habit': return { title: 'Daily iced coffee', amount: '150' };
    case 'weekly_habit': return { title: 'Weekly treat', amount: '150' };
    case 'cancel_subscription': return { title: 'Pause subscription', amount: '' };
    case 'extra_income': return { title: 'Freelance payment', amount: '1200' };
    case 'goal_contribution': return { title: 'Add to savings', amount: '300' };
    case 'skip_commitment': return { title: 'Skip this bill', amount: '' };
    case 'delay_commitment': return { title: 'Reschedule this bill', amount: '' };
    default: return { title: '', amount: '' };
  }
};

const riskIndex: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };

function MoneyMetric({ label, before, after, money = true }: { label: string; before: number; after: number; money?: boolean }) {
  const delta = after - before;
  const good = delta === 0 || delta > 0;
  const format = (n: number) => money ? inr(n) : `${Math.round(n)}`;
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3.5"><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-3 flex items-end justify-between gap-2"><div><div className="text-[10px] text-[var(--muted)]">Before</div><div className="mt-0.5 text-sm font-semibold">{format(before)}</div></div><div className="pb-1 text-xs text-[var(--muted)]">→</div><div className="text-right"><div className="text-[10px] text-[var(--muted)]">After</div><div className={`mt-0.5 text-sm font-bold ${delta === 0 ? 'text-[var(--text)]' : good ? 'text-emerald-500' : 'text-rose-500'}`}>{format(after)}</div></div></div><div className={`mt-2 text-[10px] font-bold ${delta === 0 ? 'text-[var(--muted)]' : good ? 'text-emerald-500' : 'text-rose-500'}`}>{delta === 0 ? 'No change' : `${delta > 0 ? '+' : '−'}${format(Math.abs(delta))} ${money ? '' : 'points'}`}</div></div>;
}

function getVerdict(before: FinanceMetrics, after: FinanceMetrics, startingBalance: number) {
  if (after.balance < 0 || after.riskLevel === 'Critical' || after.projectedEndBalance < -startingBalance * 0.03) {
    return { label: 'Dangerous', tone: 'red' as const, icon: AlertTriangle, title: 'This move puts the runway in danger.', detail: 'Your current balance or projected month-end buffer turns negative. Consider a smaller amount, wait, or offset the cost before applying.' };
  }
  if (riskIndex[after.riskLevel] > riskIndex[before.riskLevel] || after.safeDailyAllowance < before.safeDailyAllowance * 0.75 || after.projectedEndBalance < 0 || after.healthScore < before.healthScore - 5) {
    return { label: 'Risky', tone: 'amber' as const, icon: AlertTriangle, title: 'This move has a real trade-off.', detail: 'You can choose it, but you will have less room for everyday spending or future obligations. Try a smaller or later version.' };
  }
  return { label: 'Safe', tone: 'green' as const, icon: ShieldCheck, title: 'This move looks manageable.', detail: 'Your projected runway stays in workable shape. Keep an eye on bills and re-check if another expense lands.' };
}

export default function DecisionLab() {
  const store = useFinanceStore();
  const data: FinanceData = selectFinanceData(store);
  const [type, setType] = useState<DecisionType>('one_time_purchase');
  const [title, setTitle] = useState('New sneakers');
  const [amount, setAmount] = useState('1800');
  const [category, setCategory] = useState<ExpenseCategory>('Shopping');
  const [targetId, setTargetId] = useState(store.subscriptions.find((item) => item.active)?.id ?? '');
  const [billingDay, setBillingDay] = useState(String(Math.min(store.profile.totalDays, store.currentDay + 1)));
  const [expenseDay, setExpenseDay] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [appliedResult, setAppliedResult] = useState<{ before: FinanceData; after: FinanceData } | null>(null);
  const [naturalPrompt, setNaturalPrompt] = useState('');
  const [promptError, setPromptError] = useState('');
  const [promptExplanation, setPromptExplanation] = useState('');

  const needsAmount = ['one_time_purchase', 'unexpected_expense', 'new_subscription', 'recurring_habit', 'weekly_habit', 'extra_income', 'goal_contribution'].includes(type);
  const draft: DecisionDraft = {
    type, title: title.trim(), amount: amount.trim() ? Number(amount) : 0, category,
    targetId, billingDay: Number(billingDay), expenseDay,
  };
  // This is a small, pure local calculation; computing it directly keeps the draft and preview in sync.
  const preview = applyDecisionDraft(data, draft);
  const afterData = applied && appliedResult ? appliedResult.after : preview.data;
  const beforeData = applied && appliedResult ? appliedResult.before : data;
  const beforeMetrics = calculateMetrics(beforeData);
  const afterMetrics = afterData ? calculateMetrics(afterData) : null;
  const verdict = afterMetrics ? getVerdict(beforeMetrics, afterMetrics, store.profile.startingBalance) : null;

  const switchType = (newType: DecisionType) => {
    setType(newType);
    const sample = sampleFor(newType);
    setTitle(sample.title); setAmount(sample.amount); setError(''); setApplied(false); setAppliedResult(null); setExpenseDay(undefined);
    if (newType === 'cancel_subscription') setTargetId(store.subscriptions.find((item) => item.active)?.id ?? '');
    if (newType === 'unexpected_expense') { setTargetId(''); setCategory('Other'); }
    if (newType === 'goal_contribution') setTargetId(store.goals[0]?.id ?? '');
    if (newType === 'skip_commitment' || newType === 'delay_commitment') {
      const commitment = store.commitments.find((item) => !item.paid && !item.skipped);
      setTargetId(commitment?.id ?? '');
      setBillingDay(String(Math.min(store.profile.totalDays, Math.max(store.currentDay + 1, (commitment?.dueDay ?? store.currentDay) + 3))));
    }
  };
  const interpretPrompt = (value = naturalPrompt) => {
    const interpreted = interpretDecisionText(value, data);
    if (!interpreted.result) {
      setPromptError(interpreted.error ?? 'Describe a decision with an amount.');
      setPromptExplanation('');
      return;
    }
    const prepared = interpreted.result;
    const nextType = prepared.draft.type;
    const sample = sampleFor(nextType);
    setType(nextType);
    setTitle(prepared.draft.title ?? sample.title);
    setAmount(prepared.draft.amount === undefined ? sample.amount : String(prepared.draft.amount));
    setCategory(prepared.draft.category);
    setTargetId(prepared.draft.targetId ?? (nextType === 'goal_contribution'
      ? store.goals[0]?.id ?? ''
      : nextType === 'cancel_subscription'
        ? store.subscriptions.find((item) => item.active)?.id ?? ''
        : nextType === 'skip_commitment' || nextType === 'delay_commitment'
          ? store.commitments.find((item) => !item.paid && !item.skipped)?.id ?? ''
          : ''));
    setBillingDay(String(prepared.draft.billingDay ?? Math.min(store.profile.totalDays, store.currentDay + 1)));
    setExpenseDay(prepared.draft.expenseDay);
    setError(''); setApplied(false); setAppliedResult(null);
    setPromptError('');
    setPromptExplanation(`${prepared.explanation} Review the editable fields and impact preview below; nothing has been applied.`);
  };
  const apply = () => {
    if (preview.error || !preview.data) { setError(preview.error || 'Fix the inputs before applying.'); return; }
    const before = data;
    const after = preview.data;
    const result = store.applyDecision(draft);
    if (result.error) { setError(result.error); return; }
    if (after) setAppliedResult({ before, after });
    setError(''); setApplied(true);
  };
  const discard = () => {
    const sample = sampleFor(type);
    setTitle(sample.title); setAmount(sample.amount); setError(''); setApplied(false); setAppliedResult(null); setExpenseDay(undefined);
  };

  const alternatives = (() => {
    const result: Array<{ label: string; detail: string; draft: DecisionDraft }> = [];
    if (type === 'one_time_purchase' || type === 'unexpected_expense') {
      result.push({ label: 'Try the half-price version', detail: `Model it at ${inr(Math.max(1, Math.round(Number(amount || 0) * 0.5)))} instead.`, draft: { ...draft, amount: Math.max(1, Math.round(Number(amount || 0) * 0.5)) } });
      result.push({ label: 'Wait 3 days', detail: 'Keep today’s balance intact and see the later-day hit in your forecast.', draft: { ...draft, expenseDay: Math.min(30, store.currentDay + 3) } });
      const sub = store.subscriptions.filter((item) => item.active && item.billingDay > store.currentDay).sort((a, b) => b.amount - a.amount)[0];
      if (sub) result.push({ label: `Pause ${sub.name} instead`, detail: `Free up ${inr(sub.amount)} before its next bill.`, draft: { type: 'cancel_subscription', title: sub.name, amount: 0, category: 'Other', targetId: sub.id } });
    } else if (type === 'new_subscription') {
      result.push({ label: 'Choose a lighter plan', detail: `Try ${inr(Math.max(1, Math.round(Number(amount || 0) * 0.5)))} instead.`, draft: { ...draft, amount: Math.max(1, Math.round(Number(amount || 0) * 0.5)) } });
      const sub = store.subscriptions.filter((item) => item.active && item.billingDay > store.currentDay).sort((a, b) => b.amount - a.amount)[0];
      if (sub) result.push({ label: `Pause ${sub.name} first`, detail: `Offset ${inr(sub.amount)} of future charges.`, draft: { type: 'cancel_subscription', title: sub.name, amount: 0, category: 'Other', targetId: sub.id } });
    } else if (type === 'recurring_habit') {
      result.push({ label: 'Make it 50% cheaper', detail: `Your daily habit becomes ${inr(Math.max(1, Math.round(Number(amount || 0) * 0.5)))}/day.`, draft: { ...draft, amount: Math.max(1, Math.round(Number(amount || 0) * 0.5)) } });
      result.push({ label: 'Swap to a weekly ritual', detail: `Pay ${inr(Math.max(1, Math.round(Number(amount || 0))))} once every seven days instead of every day.`, draft: { ...draft, type: 'weekly_habit', amount: Math.max(1, Math.round(Number(amount || 0))), title: `${title} (weekly)` } });
    } else if (type === 'weekly_habit') {
      result.push({ label: 'Make the weekly treat cheaper', detail: `Reduce the spend to ${inr(Math.max(1, Math.round(Number(amount || 0) * 0.5)))} each week.`, draft: { ...draft, amount: Math.max(1, Math.round(Number(amount || 0) * 0.5)) } });
      result.push({ label: 'Pause the habit for now', detail: 'Keep the current budget untouched and revisit this choice later.', draft: { ...draft, type: 'one_time_purchase', title: 'Optional treat (one-time)', amount: Math.max(1, Math.round(Number(amount || 0))), expenseDay: store.currentDay } });
    } else if (type === 'goal_contribution') {
      result.push({ label: 'Start with half', detail: 'Protect cash for bills, then top up later.', draft: { ...draft, amount: Math.max(1, Math.round(Number(amount || 0) * 0.5)) } });
      if (store.goals.some((item) => item.id !== targetId)) {
        const other = store.goals.find((item) => item.id !== targetId)!;
        result.push({ label: `Put it toward ${other.title}`, detail: 'Change which goal gets the contribution.', draft: { ...draft, targetId: other.id } });
      }
    } else if (type === 'skip_commitment') {
      const sub = store.subscriptions.filter((item) => item.active && item.billingDay > store.currentDay).sort((a, b) => b.amount - a.amount)[0];
      if (sub) result.push({ label: `Pause ${sub.name} instead`, detail: `Keep the commitment and free ${inr(sub.amount)}.`, draft: { type: 'cancel_subscription', title: sub.name, amount: 0, category: 'Other', targetId: sub.id } });
      const commitment = store.commitments.find((item) => item.id === targetId && !item.paid && !item.skipped);
      if (commitment && store.currentDay < store.profile.totalDays) result.push({ label: 'Reschedule instead of skipping', detail: 'Keep the bill in the plan but move it to a later available day.', draft: { type: 'delay_commitment', title: commitment.title, amount: 0, category: 'Other', targetId: commitment.id, billingDay: Math.min(store.profile.totalDays, Math.max(store.currentDay + 1, commitment.dueDay + 3)) } });
    } else if (type === 'delay_commitment') {
      const sub = store.subscriptions.filter((item) => item.active && item.billingDay > store.currentDay).sort((a, b) => b.amount - a.amount)[0];
      if (sub) result.push({ label: `Pause ${sub.name} instead`, detail: `Compare the ${inr(sub.amount)} upcoming bill against the delay.`, draft: { type: 'cancel_subscription', title: sub.name, amount: 0, category: 'Other', targetId: sub.id } });
      result.push({ label: 'Choose the earliest workable date', detail: 'Limit the delay and keep the obligation visible in the forecast.', draft: { ...draft, billingDay: Math.min(store.profile.totalDays, store.currentDay + 1) } });
    } else if (type === 'cancel_subscription') {
      const alternativeSub = store.subscriptions.filter((item) => item.active && item.billingDay > store.currentDay && item.id !== targetId).sort((a, b) => b.amount - a.amount)[0];
      if (alternativeSub) result.push({ label: `Pause ${alternativeSub.name} instead`, detail: `Compare the ${inr(alternativeSub.amount)} bill before deciding.`, draft: { ...draft, targetId: alternativeSub.id, title: alternativeSub.name } });
    } else if (type === 'extra_income') {
      result.push({ label: 'Use a conservative estimate', detail: `Count ${inr(Math.max(1, Math.round(Number(amount || 0) * 0.75)))} until the full amount is confirmed.`, draft: { ...draft, amount: Math.max(1, Math.round(Number(amount || 0) * 0.75)) } });
      result.push({ label: 'Stress-test a smaller payment', detail: `See whether the plan still works if only ${inr(Math.max(1, Math.round(Number(amount || 0) * 0.5)))} arrives.`, draft: { ...draft, amount: Math.max(1, Math.round(Number(amount || 0) * 0.5)) } });
    }
    return result.slice(0, 3);
  })();

  const applyAlternative = (alternativeDraft: DecisionDraft) => {
    setType(alternativeDraft.type); setTitle(alternativeDraft.title); setAmount(alternativeDraft.amount > 0 ? String(alternativeDraft.amount) : ''); setCategory(alternativeDraft.category); setTargetId(alternativeDraft.targetId ?? ''); setBillingDay(String(alternativeDraft.billingDay ?? Math.min(30, store.currentDay + 1))); setExpenseDay(alternativeDraft.expenseDay); setError(''); setApplied(false); setAppliedResult(null);
  };

  return <div className="space-y-6">
    <PageHeading eyebrow="Signature feature" title="Think it through before you spend." description="A private sandbox for your money choices. Nothing changes until you hit Apply — try the trade-off, compare the future, then decide." action={<Badge tone="purple"><FlaskConical size={13} /> Simulate first</Badge>} />

    <div className="grid gap-5 xl:grid-cols-[.86fr_1.14fr]">
      <Card className="h-fit">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-violet-500"><Lightbulb size={15} /> Build a decision</div><h2 className="mt-1 text-lg font-bold">What are you thinking of doing?</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Describe a choice in your own words or choose a decision type below. Runway prepares an editable preview; nothing changes until Apply.</p>
        <div className="mt-4 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[.07] to-cyan-500/[.04] p-3.5 sm:p-4">
          <Field label="Describe your money decision" hint="Local rule-based interpretation. No API or account data leaves this device.">
            <Input value={naturalPrompt} onChange={(event) => { setNaturalPrompt(event.target.value); setPromptError(''); setPromptExplanation(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); interpretPrompt(); } }} maxLength={180} placeholder="e.g. Buy sneakers for ₹1,800" aria-describedby="decision-prompt-examples" />
          </Field>
          <div id="decision-prompt-examples" className="mt-2 flex flex-wrap gap-1.5">
            {['Buy sneakers for ₹1,800', '₹150 coffee daily', 'Pause Netflix', 'Save ₹300 for Goa trip'].map((example) => <button key={example} type="button" onClick={() => { setNaturalPrompt(example); interpretPrompt(example); }} className="min-h-8 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 text-[10px] font-semibold text-[var(--muted)] hover:border-violet-400/60 hover:text-[var(--text)]">{example}</button>)}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"><Button variant="outline" size="sm" onClick={() => interpretPrompt()}><Sparkles size={14} /> Interpret decision</Button><span className="text-[10px] text-[var(--muted)]">Preview only · no data is written</span></div>
          {promptError && <div className="mt-3" role="alert"><InlineNotice tone="warning">{promptError}</InlineNotice></div>}
          {promptExplanation && <div className="mt-3" role="status"><InlineNotice tone="success">{promptExplanation}</InlineNotice></div>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">{decisionOptions.map((option) => <button key={option.value} type="button" aria-pressed={type === option.value} onClick={() => switchType(option.value)} className={`min-h-11 rounded-xl border p-3 text-left transition ${type === option.value ? 'border-violet-500 bg-violet-500/10 shadow-sm' : 'border-[var(--border)] bg-[var(--panel)] hover:border-violet-400/50'}`}><span className="block text-xs font-bold">{option.label}</span><span className="mt-1 block text-[10px] leading-4 text-[var(--muted)]">{option.description}</span></button>)}</div>
        <div className="mt-5 space-y-4">
          {type !== 'cancel_subscription' && type !== 'skip_commitment' && type !== 'delay_commitment' && <Field label={type === 'unexpected_expense' ? 'What happened?' : type === 'recurring_habit' || type === 'weekly_habit' ? 'What habit?' : type === 'new_subscription' ? 'Subscription name' : type === 'goal_contribution' ? 'Decision label' : type === 'extra_income' ? 'Income source' : 'Decision label'}><Input value={title} onChange={(event) => { setTitle(event.target.value); setError(''); setApplied(false); setAppliedResult(null); }} placeholder="Give the decision a name" maxLength={64} /></Field>}
          {needsAmount && <Field label={type === 'unexpected_expense' ? 'Unexpected expense amount (₹)' : type === 'recurring_habit' ? 'Daily amount (₹)' : type === 'weekly_habit' ? 'Weekly amount (₹)' : type === 'new_subscription' ? 'Subscription amount (₹/cycle)' : type === 'goal_contribution' ? 'Contribution amount (₹)' : 'Amount (₹)'} hint={type === 'recurring_habit' ? 'This repeats every day through Day 30.' : type === 'weekly_habit' ? 'This repeats every seven days through Day 30.' : undefined}><Input type="number" min="1" max="10000000" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setError(''); setApplied(false); setAppliedResult(null); }} placeholder="0" /></Field>}
          {(type === 'one_time_purchase' || type === 'unexpected_expense' || type === 'recurring_habit' || type === 'weekly_habit') && <Field label="Spending category"><Select value={category} onChange={(event) => { setCategory(event.target.value as ExpenseCategory); setApplied(false); setAppliedResult(null); }}>{['Food', 'Travel', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other'].map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>}
          {type === 'new_subscription' && <Field label="First bill day"><Select value={billingDay} onChange={(event) => { setBillingDay(event.target.value); setApplied(false); setAppliedResult(null); }}>{Array.from({ length: Math.max(1, store.profile.totalDays - store.currentDay) }, (_, index) => store.currentDay + index + 1).filter((day) => day <= 30).map((day) => <option key={day} value={String(day)}>Day {day}</option>)}</Select></Field>}
          {type === 'cancel_subscription' && <Field label="Subscription to pause"><Select value={targetId} onChange={(event) => { setTargetId(event.target.value); setApplied(false); setAppliedResult(null); }}><option value="">Choose a subscription</option>{store.subscriptions.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {inr(item.amount)} · Active</option>)}</Select></Field>}
          {type === 'unexpected_expense' && <Field label="Optional offset" hint="Choose a future subscription to pause as part of this draft, or absorb the full cost."><Select value={targetId} onChange={(event) => { setTargetId(event.target.value); setApplied(false); setAppliedResult(null); }}><option value="">No offset — absorb the full cost</option>{store.subscriptions.filter((item) => item.active && item.billingDay > store.currentDay).map((item) => <option key={item.id} value={item.id}>Pause {item.name} · {inr(item.amount)} saved later</option>)}</Select></Field>}
          {type === 'goal_contribution' && <Field label="Goal to fund"><Select value={targetId} onChange={(event) => { setTargetId(event.target.value); setApplied(false); setAppliedResult(null); }}><option value="">Choose a goal</option>{store.goals.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></Field>}
          {(type === 'skip_commitment' || type === 'delay_commitment') && <Field label={type === 'skip_commitment' ? 'Commitment to skip' : 'Commitment to reschedule'}><Select value={targetId} onChange={(event) => { setTargetId(event.target.value); setApplied(false); setAppliedResult(null); }}><option value="">Choose a commitment</option>{store.commitments.filter((item) => !item.paid && !item.skipped).map((item) => <option key={item.id} value={item.id}>{item.title} · {inr(item.amount)} · Day {item.dueDay}</option>)}</Select></Field>}
          {type === 'delay_commitment' && <Field label="New due day"><Select value={billingDay} onChange={(event) => { setBillingDay(event.target.value); setApplied(false); setAppliedResult(null); }}>{Array.from({ length: Math.max(0, store.profile.totalDays - store.currentDay) }, (_, index) => store.currentDay + index + 1).map((day) => <option key={day} value={String(day)}>Day {day}</option>)}</Select></Field>}
          {!applied && preview.error && <InlineNotice tone="warning">{preview.error}</InlineNotice>}{error && <InlineNotice tone="warning">{error}</InlineNotice>}
          <div className="flex gap-2 border-t border-[var(--border)] pt-4"><Button variant="secondary" className="flex-1" onClick={discard}><XCircle size={15} /> Discard draft</Button><Button className="flex-1" onClick={apply} disabled={applied || !preview.data || Boolean(preview.error)}><Check size={16} /> Apply decision</Button></div>
          <div className="text-center text-[10px] text-[var(--muted)]">Previewing Day {store.currentDay} of {store.profile.totalDays}. Nothing is written until Apply.</div>
        </div>
      </Card>

      <div className="space-y-5">
        {afterMetrics && verdict ? <Card className={{ green: 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[.07] to-[var(--card)]', amber: 'border-amber-500/20 bg-gradient-to-br from-amber-500/[.07] to-[var(--card)]', red: 'border-rose-500/20 bg-gradient-to-br from-rose-500/[.07] to-[var(--card)]' }[verdict.tone]}>
          <div className="flex items-start gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${verdict.tone === 'green' ? 'bg-emerald-500/10 text-emerald-500' : verdict.tone === 'amber' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}><verdict.icon size={21} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone={verdict.tone}>{verdict.label} verdict</Badge><Badge>{afterMetrics.riskLevel} risk after</Badge></div><h2 className="mt-2 text-lg font-bold">{verdict.title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{verdict.detail}</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><MoneyMetric label="Available balance" before={beforeMetrics.balance} after={afterMetrics.balance} /><MoneyMetric label="Safe daily allowance" before={beforeMetrics.safeDailyAllowance} after={afterMetrics.safeDailyAllowance} /><MoneyMetric label="Projected Day 30" before={beforeMetrics.projectedEndBalance} after={afterMetrics.projectedEndBalance} /><MoneyMetric label="Runway days" before={Number.isFinite(beforeMetrics.runwayDays) ? beforeMetrics.runwayDays : beforeMetrics.daysLeft} after={Number.isFinite(afterMetrics.runwayDays) ? afterMetrics.runwayDays : afterMetrics.daysLeft} money={false} /><MoneyMetric label="Health score" before={beforeMetrics.healthScore} after={afterMetrics.healthScore} money={false} /><div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3.5"><div className="text-xs text-[var(--muted)]">Risk level</div><div className="mt-3 flex items-center justify-between gap-2"><div><div className="text-[10px] text-[var(--muted)]">Before</div><div className="mt-1 text-sm font-semibold">{beforeMetrics.riskLevel}</div></div><ArrowRight size={14} className="text-[var(--muted)]" /><div><div className="text-[10px] text-[var(--muted)]">After</div><div className={`mt-1 text-sm font-bold ${riskIndex[afterMetrics.riskLevel] > riskIndex[beforeMetrics.riskLevel] ? 'text-rose-500' : 'text-emerald-500'}`}>{afterMetrics.riskLevel}</div></div></div></div></div>
          {applied && <div className="mt-4"><InlineNotice tone="success">Decision applied. Your shared financial state, dashboard, forecast, goals and health score have been updated. You can undo from the notification.</InlineNotice></div>}
        </Card> : <Card><InlineNotice tone="warning">This draft needs a small fix before it can be simulated. Check the required fields on the left.</InlineNotice></Card>}

        {afterData && afterMetrics && <Card><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-violet-500"><TrendingDown size={14} /> The ripple effect</div><h2 className="mt-1 text-lg font-bold">Before vs. after, all the way to Day 30.</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">The purple line shows the balance after the draft. The grey line is your current plan.</p></div><Badge tone="blue">Live preview</Badge></div><div className="mt-3"><DecisionCompareChart before={beforeData} after={afterData} /></div><div className="flex flex-wrap gap-4 text-[11px] text-[var(--muted)]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" />Current plan</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Draft decision</span></div></Card>}
      </div>
    </div>

    {afterData && <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Card><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-emerald-500">Savings impact</div><h2 className="mt-1 text-lg font-bold">Goal status after this move</h2><p className="mt-1 text-xs text-[var(--muted)]">Contributions, canceled bills and skipped commitments can change the goal path.</p></div><Target size={18} className="text-emerald-500" /></div>
        {store.goals.length ? <div className="mt-4 space-y-4">{store.goals.map((goal) => { const afterGoal = afterData.goals.find((item) => item.id === goal.id) ?? goal; const beforeSaved = getGoalSavedAmount(goal, beforeData); const afterSaved = getGoalSavedAmount(afterGoal, afterData); const beforeStatus = getGoalStatus(goal, beforeData); const afterStatus = getGoalStatus(afterGoal, afterData); const pct = Math.min(100, (afterSaved / Math.max(1, afterGoal.targetAmount)) * 100); return <div key={goal.id}><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold">{goal.title}</div><div className="mt-1 text-[11px] text-[var(--muted)]">{inr(beforeSaved)} → {inr(afterSaved)} / {inr(goal.targetAmount)}</div></div><div className="flex flex-col items-end gap-1"><Badge tone={beforeStatus === 'Complete' || beforeStatus === 'On track' ? 'green' : beforeStatus === 'At risk' ? 'amber' : 'red'}>{beforeStatus}</Badge><ArrowRight size={12} className="text-[var(--muted)]" /><Badge tone={afterStatus === 'Complete' || afterStatus === 'On track' ? 'green' : afterStatus === 'At risk' ? 'amber' : 'red'}>{afterStatus}</Badge></div></div><ProgressBar value={pct} label={`${goal.title} projected savings progress`} className="mt-2" tone={afterStatus === 'Off track' ? 'red' : afterStatus === 'At risk' ? 'amber' : 'gradient'} /></div>; })}</div> : <div className="mt-4 rounded-xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)]">No goals yet — add a savings goal to see how this decision affects it.</div>}
      </Card>

      <Card><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-violet-500">Smarter alternatives</div><h2 className="mt-1 text-lg font-bold">A different move, same goal.</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">One tap swaps the draft. Nothing applies until you choose Apply decision.</p></div><Sparkles size={18} className="text-violet-500" /></div>
        {alternatives.length ? <div className="mt-4 space-y-3">{alternatives.map((alternative, index) => <div key={`${alternative.label}-${index}`} className="rounded-2xl border border-[var(--border)] p-3.5"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">{index === 0 ? <Lightbulb size={16} /> : index === 1 ? <ShieldCheck size={16} /> : <Zap size={16} />}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{alternative.label}</div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{alternative.detail}</p></div><Button size="sm" variant="outline" onClick={() => applyAlternative(alternative.draft)}>Try <ArrowRight size={13} /></Button></div></div>)}</div> : <InlineNotice>No alternative is needed yet. The current plan stays unchanged until Apply.</InlineNotice>}
      </Card>
    </div>}

    <Card className="border-cyan-500/15 bg-gradient-to-r from-cyan-500/[.05] to-violet-500/[.04]"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500"><CircleHelp size={18} /></div><div><h3 className="font-bold">How Runway judges the trade-off</h3><p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--muted)]">It recalculates balance, upcoming obligations, goal reserve, safe daily allowance, projected Day 30 balance, runway days, risk level and the weighted health score from one shared data model. The verdict is an explainable rule-based guide, not a promise about real-world outcomes.</p></div></div></Card>
  </div>;
}
