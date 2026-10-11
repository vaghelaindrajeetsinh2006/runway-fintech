import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays,
  Check, ChevronRight, CircleDollarSign, Clock3, Coffee, Compass, CreditCard,
  HeartPulse, Lightbulb, Plus, ShieldCheck, Sparkles, TrendingDown, Wallet, Zap,
} from 'lucide-react';
import { Button, Badge, Card, Field, Input, InlineNotice, Modal, PageHeading, ProgressBar, Select } from '../components/ui';
import { ForecastChart, CategoryDonut, CategoryLegend } from '../components/Charts';
import { OnboardingCard } from '../components/OnboardingCard';
import { calculateMetrics, generateSmartAlerts, getGoalSavedAmount, getGoalStatus, applyDecisionDraft } from '../lib/finance';
import { inr, safePositiveAmount } from '../lib/format';
import { useFinanceStore } from '../store/useFinanceStore';
import type { DecisionDraft, ExpenseCategory } from '../types';

const categories: ExpenseCategory[] = ['Food', 'Travel', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other'];
const categoryEmoji: Record<ExpenseCategory, string> = { Food: '🥑', Travel: '🚌', Shopping: '🛍️', Entertainment: '🎟️', Bills: '🧾', Health: '🫶', Education: '📚', Other: '✦' };
const surpriseEvents = [
  { title: 'Phone screen repair', amount: 1800, category: 'Other' as ExpenseCategory, emoji: '📱', description: 'A cracked screen has entered the chat.' },
  { title: "Friend's birthday", amount: 600, category: 'Entertainment' as ExpenseCategory, emoji: '🎂', description: 'You want to show up, not go broke.' },
  { title: 'Unexpected medical expense', amount: 900, category: 'Health' as ExpenseCategory, emoji: '🩹', description: 'Health first. Let’s protect the rest of the month.' },
  { title: 'Bike puncture', amount: 300, category: 'Travel' as ExpenseCategory, emoji: '🛵', description: 'A tiny hole, a real budget decision.' },
];

function RiskBadge({ risk }: { risk: string }) {
  const tone = risk === 'Low' ? 'green' : risk === 'Medium' ? 'amber' : 'red';
  return <Badge tone={tone}><span className="h-1.5 w-1.5 rounded-full bg-current" />{risk} risk</Badge>;
}

function HealthRing({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 35;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return <div className="flex items-center gap-3" aria-label={`Financial health score ${score} out of 100, ${label}`}>
    <svg width="82" height="82" viewBox="0 0 82 82" role="img" aria-hidden="true">
      <circle cx="41" cy="41" r="35" fill="none" stroke="var(--soft)" strokeWidth="7" />
      <circle cx="41" cy="41" r="35" fill="none" stroke="url(#healthGradient)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 41 41)" />
      <defs><linearGradient id="healthGradient"><stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
      <text x="41" y="39" textAnchor="middle" className="fill-[var(--text)]" fontSize="18" fontWeight="800">{score}</text>
      <text x="41" y="51" textAnchor="middle" className="fill-[var(--muted)]" fontSize="8">/ 100</text>
    </svg>
    <div><div className="text-sm font-bold">{label}</div><div className="mt-1 text-xs leading-5 text-[var(--muted)]">Your money wellness<br />at a glance.</div></div>
  </div>;
}

function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useFinanceStore();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [error, setError] = useState('');
  const [confirmOverspend, setConfirmOverspend] = useState(false);
  const validAmount = safePositiveAmount(amount);
  const titleValid = title.trim().length > 0;
  const wouldOverdraw = type === 'expense' && validAmount !== null && validAmount > Math.max(0, calculateMetrics(store).balance);
  const submit = () => {
    if (!titleValid) { setError('Add a short description first.'); return; }
    if (validAmount === null) { setError('Enter an amount greater than ₹0.'); return; }
    if (wouldOverdraw && !confirmOverspend) { setConfirmOverspend(true); setError('This would take your balance below zero. Confirm if it is unavoidable.'); return; }
    if (type === 'expense') store.addExpense({ title: title.trim(), amount: validAmount, category, day: store.currentDay, type: 'discretionary' });
    else store.addIncome({ title: title.trim(), amount: validAmount, day: store.currentDay });
    setTitle(''); setAmount(''); setError(''); setConfirmOverspend(false); onClose();
  };
  return <Modal open={open} onClose={onClose} title="Quick money move" description="Log what just happened. Your dashboard recalculates everywhere.">
    <div className="mb-4 flex gap-2 rounded-xl bg-[var(--soft)] p-1"><button onClick={() => setType('expense')} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${type === 'expense' ? 'bg-[var(--panel)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'}`}>Expense</button><button onClick={() => setType('income')} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${type === 'income' ? 'bg-[var(--panel)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'}`}>Income</button></div>
    <div className="space-y-4"><Field label="What was it?"><Input value={title} onChange={(event) => { setTitle(event.target.value); setError(''); }} placeholder={type === 'expense' ? 'e.g. Lunch with friends' : 'e.g. Freelance payment'} maxLength={64} /></Field><Field label="Amount (₹)"><Input type="number" min="1" max="10000000" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setError(''); setConfirmOverspend(false); }} placeholder="0" /></Field>{type === 'expense' && <Field label="Category"><Select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>{categories.map((item) => <option key={item} value={item}>{categoryEmoji[item]} {item}</option>)}</Select></Field>}
      {error && <InlineNotice tone={confirmOverspend ? 'warning' : 'info'}>{error}</InlineNotice>}
      <div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button className="flex-1" onClick={submit}>{confirmOverspend ? 'Confirm anyway' : 'Save transaction'} <Check size={16} /></Button></div>
    </div>
  </Modal>;
}

function LifeHappensCard() {
  const store = useFinanceStore();
  const [event, setEvent] = useState<(typeof surpriseEvents)[number] | null>(null);
  const data = store;
  const beforeMetrics = calculateMetrics(data);
  const preview = useMemo(() => event ? applyDecisionDraft(data, { type: 'unexpected_expense', title: event.title, amount: event.amount, category: event.category }) : null, [data.currentDay, data.expenses, data.commitments, data.subscriptions, data.goals, event]);
  const afterMetrics = preview?.data ? calculateMetrics(preview.data) : null;
  const pickEvent = () => {
    const choices = surpriseEvents.filter((item) => item.amount <= Math.max(beforeMetrics.balance + 1500, 500));
    setEvent(choices[Math.floor(Math.random() * choices.length)] ?? surpriseEvents[3]);
  };
  const applyEvent = (delay = false, pauseSub = false) => {
    if (!event) return;
    const activeToPause = [...store.subscriptions].filter((item) => item.active && item.billingDay > store.currentDay).sort((a, b) => b.amount - a.amount)[0];
    const draft: DecisionDraft = {
      type: 'unexpected_expense', title: event.title, amount: event.amount, category: event.category,
      expenseDay: delay ? Math.min(store.profile.totalDays, store.currentDay + 3) : store.currentDay,
      ...(pauseSub && activeToPause ? { targetId: activeToPause.id } : {}),
    };
    const result = store.applyDecision(draft);
    if (!result.error) setEvent(null);
  };
  return <Card className="overflow-hidden border-amber-500/15 bg-gradient-to-br from-amber-500/[.07] via-[var(--card)] to-rose-500/[.04]">
    <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-amber-500"><Zap size={14} /> Life happens</div><h3 className="mt-2 text-lg font-bold">The plot twist fund</h3><p className="mt-1 max-w-md text-sm leading-5 text-[var(--muted)]">Simulate a surprise expense and decide how to absorb it before real life does.</p></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl">🧯</div></div>
    {!event ? <Button className="mt-4 w-full sm:w-auto" onClick={pickEvent}>Hit me with a surprise <Sparkles size={15} /></Button> : <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex items-start gap-3"><div className="text-3xl">{event.emoji}</div><div className="min-w-0 flex-1"><div className="font-semibold">{event.title}</div><p className="mt-1 text-sm text-[var(--muted)]">{event.description}</p></div><div className="text-lg font-black text-rose-500">−{inr(event.amount)}</div></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-xl bg-[var(--soft)] p-3"><div className="text-[11px] text-[var(--muted)]">Balance after</div><div className={`mt-1 font-bold ${afterMetrics && afterMetrics.balance < 0 ? 'text-rose-500' : ''}`}>{afterMetrics ? inr(afterMetrics.balance) : '—'}</div></div><div className="rounded-xl bg-[var(--soft)] p-3"><div className="text-[11px] text-[var(--muted)]">Safe/day after</div><div className="mt-1 font-bold">{afterMetrics ? inr(afterMetrics.safeDailyAllowance) : '—'}</div></div><div className="col-span-2 rounded-xl bg-[var(--soft)] p-3 sm:col-span-1"><div className="text-[11px] text-[var(--muted)]">Risk after</div><div className="mt-1 font-bold">{afterMetrics?.riskLevel ?? '—'}</div></div></div>
      <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => applyEvent()}>Absorb it <ArrowRight size={14} /></Button><Button size="sm" variant="secondary" disabled={store.currentDay >= 30} onClick={() => applyEvent(true)}>Delay 3 days</Button><Button size="sm" variant="outline" disabled={!store.subscriptions.some((item) => item.active && item.billingDay > store.currentDay)} onClick={() => applyEvent(false, true)}>Pause a sub & absorb</Button><Button size="sm" variant="ghost" onClick={() => setEvent(null)}>Discard</Button></div>
    </div>}
  </Card>;
}

export default function Dashboard() {
  const store = useFinanceStore();
  const navigate = useNavigate();
  const metrics = calculateMetrics(store);
  const alerts = generateSmartAlerts(store);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const balance = metrics.balance;
  const totalSpent = store.expenses.filter((item) => item.day <= store.currentDay).reduce((total, item) => total + item.amount, 0);
  const dayProgress = (store.currentDay / store.profile.totalDays) * 100;
  const upcomingNextWeek = metrics.upcomingItems.filter((item) => item.day <= store.currentDay + 7).slice(0, 4);
  const categoryEmojiMap = categoryEmoji;
  const ringCircumference = 2 * Math.PI * 45;
  const ringOffset = ringCircumference - ringCircumference * (dayProgress / 100);
  const futureCommitmentItems = store.commitments.filter((item) => !item.paid && !item.skipped && item.dueDay > store.currentDay).length;
  const activeSubscriptionCount = store.subscriptions.filter((item) => item.active).length;

  return <div className="space-y-6">
    <OnboardingCard />
    <PageHeading eyebrow="Your money, minus the mystery" title={`Hey ${store.profile.name || 'there'} 👋`} description="30 days. ₹10,000. A plan that moves when life does." action={<Button onClick={() => setQuickAddOpen(true)}><Plus size={17} /> Quick add</Button>} />

    <div className="grid gap-4 xl:grid-cols-[1.45fr_.85fr]">
      <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-[#5b36d8] via-[#4631a9] to-[#1b547e] p-5 text-white shadow-glow sm:p-7">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border border-white/10" /><div className="absolute -right-2 -top-8 h-44 w-44 rounded-full border border-white/10" /><div className="absolute bottom-[-4rem] left-[44%] h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><div className="flex items-center gap-2 text-sm text-violet-100"><Wallet size={16} /> Available balance <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Live</span></div><div className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-5xl">{inr(balance)}</div><div className="mt-3 flex flex-wrap items-center gap-2"><RiskBadge risk={metrics.riskLevel} /><span className="text-xs text-violet-100/85">{metrics.riskReason}</span></div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md"><div className="rounded-2xl border border-white/10 bg-white/[.08] p-3.5 backdrop-blur"><div className="text-xs text-violet-100/80">Safe to spend today</div><div className="mt-1 text-2xl font-extrabold tracking-tight">{inr(metrics.safeDailyAllowance)}</div><div className="mt-1 text-[10px] text-violet-100/75">After bills + goal reserve</div></div><div className="rounded-2xl border border-white/10 bg-white/[.08] p-3.5 backdrop-blur"><div className="text-xs text-violet-100/80">Projected Day 30</div><div className={`mt-1 text-2xl font-extrabold tracking-tight ${metrics.projectedEndBalance < 0 ? 'text-rose-200' : 'text-emerald-200'}`}>{inr(metrics.projectedEndBalance)}</div><div className="mt-1 text-[10px] text-violet-100/75">At your current pace</div></div></div>
          </div>
          <div className="mx-auto flex flex-col items-center sm:mx-0"><div className="relative flex h-36 w-36 items-center justify-center"><svg width="144" height="144" viewBox="0 0 144 144" aria-hidden="true"><circle cx="72" cy="72" r="45" stroke="rgba(255,255,255,.17)" strokeWidth="7" fill="none" /><circle cx="72" cy="72" r="45" stroke="#67e8f9" strokeWidth="7" strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} transform="rotate(-90 72 72)" fill="none" /><circle cx="72" cy="72" r="34" stroke="rgba(255,255,255,.13)" strokeDasharray="3 5" fill="none" /></svg><div className="absolute text-center"><div className="text-3xl font-black">{store.currentDay}<span className="text-sm font-semibold text-violet-100">/30</span></div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-100/80">Day of runway</div></div></div><div className="mt-1 text-xs text-violet-100/80">{metrics.daysLeft} days left</div><div className="mt-3 flex gap-2"><button aria-label="Previous day" onClick={() => store.setCurrentDay(store.currentDay - 1)} disabled={store.currentDay <= 1} className="flex h-9 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold hover:bg-white/10 disabled:opacity-35">− Day</button><button aria-label="Next day" onClick={() => { store.advanceDays(1); if (store.currentDay >= 29) navigate('/summary'); }} disabled={store.currentDay >= 30} className="flex h-9 items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-semibold hover:bg-white/15 disabled:opacity-35">+ Day <ChevronRight size={14} /></button></div></div>
        </div>
      </Card>

      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-[var(--muted)]">Financial health</div><div className="mt-1 text-lg font-bold">Your money pulse</div></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><HeartPulse size={19} /></div></div>
        <div className="mt-5 flex items-center justify-between gap-4"><HealthRing score={metrics.healthScore} label={metrics.healthLabel} /></div>
        <div className="mt-4 space-y-3">{[
          { label: 'Runway', value: metrics.healthBreakdown.runway, weight: '30%' },
          { label: 'Spending pace', value: metrics.healthBreakdown.pace, weight: '25%' },
          { label: 'Savings progress', value: metrics.healthBreakdown.savings, weight: '20%' },
        ].map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between text-xs"><span className="text-[var(--muted)]">{item.label}</span><span className="font-semibold">{Math.round(item.value)}% <span className="text-[var(--muted)]">· {item.weight}</span></span></div><ProgressBar value={item.value} /></div>)}</div>
        <Link to="/insights" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-500 hover:text-violet-400">See health breakdown <ArrowRight size={15} /></Link>
      </Card>
    </div>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-[var(--muted)]">Spent so far</span><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500"><ArrowUpRight size={16} /></div></div><div className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">{inr(totalSpent)}</div><div className="mt-1 text-[11px] text-[var(--muted)]">Flexible + surprise spends</div></Card>
      <Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-[var(--muted)]">Bills to protect</span><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><CreditCard size={16} /></div></div><div className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">{inr(metrics.upcomingObligations)}</div><div className="mt-1 text-[11px] text-[var(--muted)]">{futureCommitmentItems} commitments · future charges</div></Card>
      <Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-[var(--muted)]">Avg daily spend</span><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500"><Activity size={16} /></div></div><div className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">{inr(metrics.avgDailySpend)}<span className="ml-1 text-xs font-medium text-[var(--muted)]">/day</span></div><div className="mt-1 text-[11px] text-[var(--muted)]">Safe pace is {inr(metrics.safeDailyAllowance)}</div></Card>
      <Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-[var(--muted)]">Active subscriptions</span><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500"><Zap size={16} /></div></div><div className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">{activeSubscriptionCount}<span className="ml-1 text-xs font-medium text-[var(--muted)]">active</span></div><div className="mt-1 text-[11px] text-[var(--muted)]">{inr(store.subscriptions.filter((item) => item.active).reduce((total, item) => total + item.amount, 0))}/cycle</div></Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-violet-500"><Activity size={14} /> Balance forecast</div><h2 className="mt-1 text-lg font-bold">Where your money is heading</h2><p className="mt-1 text-xs text-[var(--muted)]">The line responds to every spend, bill and decision.</p></div><Badge tone={metrics.projectedEndBalance < 0 ? 'red' : 'blue'}>{metrics.projectedZeroDay ? `Zero near Day ${metrics.projectedZeroDay}` : '30-day outlook'}</Badge></div>
        <div className="mt-4"><ForecastChart data={store} compact /></div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3"><div className="flex items-center gap-4 text-[11px] text-[var(--muted)]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-400" />Current</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Projected</span></div><Link to="/insights" className="text-xs font-bold text-violet-500">Open insights →</Link></div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-amber-500"><AlertTriangle size={14} /> Smart alerts</div><h2 className="mt-1 text-lg font-bold">A heads-up, not a lecture.</h2></div><Badge>{alerts.length} active</Badge></div>
        <div className="mt-4 space-y-3">{alerts.map((alert) => {
          const tone = alert.tone === 'red' ? 'border-rose-500/15 bg-rose-500/[.05]' : alert.tone === 'amber' ? 'border-amber-500/15 bg-amber-500/[.05]' : alert.tone === 'green' ? 'border-emerald-500/15 bg-emerald-500/[.05]' : 'border-sky-500/15 bg-sky-500/[.05]';
          const iconColor = alert.tone === 'red' ? 'text-rose-500' : alert.tone === 'amber' ? 'text-amber-500' : alert.tone === 'green' ? 'text-emerald-500' : 'text-sky-500';
          return <div key={alert.id} className={`flex gap-3 rounded-2xl border p-3 ${tone}`}><div className={`mt-0.5 ${iconColor}`}><AlertTriangle size={17} /></div><div><div className="text-sm font-semibold">{alert.title}</div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{alert.detail}</p></div></div>;
        })}</div>
        <Link to="/decision-lab" className="mt-4 flex min-h-11 items-center justify-between rounded-xl bg-violet-500/10 px-3 text-sm font-semibold text-violet-500 hover:bg-violet-500/15"><span className="flex items-center gap-2"><Lightbulb size={16} /> Test a money move</span><ChevronRight size={17} /></Link>
      </Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
      <Card>
        <div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-[var(--muted)]">Upcoming · 7 days</div><h2 className="mt-1 text-lg font-bold">Bills with a date</h2></div><Link to="/commitments" className="text-xs font-bold text-violet-500">Manage all <ArrowRight size={14} className="ml-1 inline" /></Link></div>
        {upcomingNextWeek.length ? <div className="mt-4 divide-y divide-[var(--border)]">{upcomingNextWeek.map((item) => <div key={`${item.kind}-${item.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.kind === 'subscription' ? 'bg-violet-500/10 text-violet-500' : 'bg-amber-500/10 text-amber-500'}`}>{item.kind === 'subscription' ? <Zap size={17} /> : <CalendarDays size={17} />}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{item.title}</div><div className="mt-0.5 text-xs text-[var(--muted)]">Day {item.day} · {item.kind === 'subscription' ? 'Subscription' : 'Commitment'}</div></div><div className="text-sm font-bold">{inr(item.amount)}</div></div>)}</div> : <div className="py-8 text-center text-sm text-[var(--muted)]">No upcoming bills in the next week. A rare and beautiful moment.</div>}
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-[var(--muted)]">Goals in progress</div><h2 className="mt-1 text-lg font-bold">Keep future-you funded</h2></div><Link to="/goals" className="text-xs font-bold text-violet-500">All goals <ArrowRight size={14} className="ml-1 inline" /></Link></div>
        {store.goals.length ? <div className="mt-4 space-y-5">{store.goals.slice(0, 3).map((goal) => { const saved = getGoalSavedAmount(goal, store); const pct = Math.min(100, (saved / goal.targetAmount) * 100); const status = getGoalStatus(goal, store); return <div key={goal.id}><div className="mb-2 flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">{goal.title}</div><div className="mt-0.5 text-[11px] text-[var(--muted)]">{inr(saved)} of {inr(goal.targetAmount)}</div></div><Badge tone={status === 'Complete' || status === 'On track' ? 'green' : status === 'At risk' ? 'amber' : 'red'}>{status}</Badge></div><ProgressBar value={pct} tone={status === 'Off track' ? 'red' : status === 'At risk' ? 'amber' : 'gradient'} /><div className="mt-1.5 text-right text-[10px] text-[var(--muted)]">{Math.round(pct)}% saved · Day {goal.deadlineDay} deadline</div></div>; })}</div> : <div className="py-8 text-center text-sm text-[var(--muted)]">No goals yet. Give your savings a name and a finish line.</div>}
      </Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <LifeHappensCard />
      <Card>
        <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-[var(--muted)]">Spending snapshot</div><h2 className="mt-1 text-lg font-bold">Your money's current playlist</h2><p className="mt-1 text-xs text-[var(--muted)]">What has the biggest slice so far?</p></div><Link to="/transactions" className="text-xs font-bold text-violet-500">Transactions →</Link></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[.9fr_1.1fr] sm:items-center"><CategoryDonut data={store} compact /><CategoryLegend data={store} /></div>
      </Card>
    </div>

    <Card className="border-[var(--border)] bg-[var(--panel)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><Clock3 size={19} /></div><div><h2 className="font-bold">Time travel, but make it financial.</h2><p className="mt-1 text-sm leading-5 text-[var(--muted)]">Advance the month to trigger bills and test how your runway changes. Events charge automatically on their due day.</p></div></div><div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => store.advanceDays(1)} disabled={store.currentDay >= 30}>Next day <ChevronRight size={14} /></Button><Button variant="outline" size="sm" onClick={() => store.advanceDays(7)} disabled={store.currentDay >= 30}>Skip 7 days <ArrowRight size={14} /></Button>{store.currentDay >= 30 && <Button size="sm" onClick={() => navigate('/summary')}>Month recap <ArrowRight size={14} /></Button>}</div></div>
      <div className="mt-5 rounded-2xl bg-[var(--soft)] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between text-xs"><span className="font-semibold">Day {store.currentDay}</span><span className="text-[var(--muted)]">Day 30</span></div><input aria-label="Simulated current day" type="range" min="1" max="30" value={store.currentDay} onChange={(event) => store.setCurrentDay(Number(event.target.value))} className="w-full accent-violet-500" /><div className="mt-2 flex justify-between text-[10px] text-[var(--muted)]"><span>Start</span><span>Commitments charge automatically as you move</span><span>Finish</span></div></div>
    </Card>

    <div className="fixed bottom-24 right-4 z-30 lg:bottom-8 lg:right-8"><Button size="lg" className="h-14 rounded-full px-5 shadow-xl shadow-violet-900/30" onClick={() => setQuickAddOpen(true)}><Plus size={19} /><span className="hidden sm:inline">Add transaction</span><span className="sm:hidden">Add</span></Button></div>
    <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
  </div>;
}
