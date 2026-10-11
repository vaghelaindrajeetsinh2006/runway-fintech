import { useState } from 'react';
import { ArrowRight, Flag, PiggyBank, Plus, Target, Trash2, PencilLine, Sparkles, CalendarClock } from 'lucide-react';
import { Button, Badge, Card, EmptyState, Field, Input, Modal, PageHeading, ProgressBar, Select, InlineNotice } from '../components/ui';
import { inr, safePositiveAmount } from '../lib/format';
import { calculateBalance, calculateMetrics, getGoalSavedAmount, getGoalStatus } from '../lib/finance';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Goal, GoalPriority } from '../types';

export default function Goals() {
  const store = useFinanceStore();
  const metrics = calculateMetrics(store);
  const [goalModal, setGoalModal] = useState(false);
  const [contributeModal, setContributeModal] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('0');
  const [monthlyContribution, setMonthlyContribution] = useState('500');
  const [deadlineDay, setDeadlineDay] = useState('30');
  const [priority, setPriority] = useState<GoalPriority>('Medium');
  const [contributionAmount, setContributionAmount] = useState('');
  const [error, setError] = useState('');

  const openNew = () => {
    setEditId(null); setTitle(''); setTargetAmount(''); setSavedAmount('0'); setMonthlyContribution('500'); setDeadlineDay('30'); setPriority('Medium'); setError(''); setGoalModal(true);
  };
  const openEdit = (goal: Goal) => {
    setEditId(goal.id); setTitle(goal.title); setTargetAmount(String(goal.targetAmount)); setSavedAmount(String(goal.savedAmount)); setMonthlyContribution(String(goal.monthlyContribution)); setDeadlineDay(String(goal.deadlineDay)); setPriority(goal.priority); setError(''); setGoalModal(true);
  };
  const saveGoal = () => {
    if (!title.trim()) { setError('Give the goal a name.'); return; }
    const target = safePositiveAmount(targetAmount);
    const baseSaved = savedAmount.trim() === '' ? 0 : Number(savedAmount);
    const monthly = safePositiveAmount(monthlyContribution);
    const deadline = Number(deadlineDay);
    if (target === null) { setError('Target must be greater than ₹0.'); return; }
    if (!Number.isFinite(baseSaved) || baseSaved < 0 || baseSaved > 10_000_000) { setError('Already-saved amount must be zero or a positive amount.'); return; }
    if (monthly === null) { setError('Planned monthly contribution must be greater than ₹0.'); return; }
    if (!Number.isInteger(deadline) || deadline < 1 || deadline > 30) { setError('Deadline must be between Day 1 and Day 30.'); return; }
    if (editId) store.updateGoal(editId, { title: title.trim(), targetAmount: target, monthlyContribution: monthly, deadlineDay: deadline, priority });
    else store.addGoal({ title: title.trim(), targetAmount: target, savedAmount: baseSaved, monthlyContribution: monthly, deadlineDay: deadline, priority });
    setGoalModal(false);
  };
  const activeGoal = store.goals.find((item) => item.id === contributeModal) ?? null;
  const saveContribution = () => {
    const amount = safePositiveAmount(contributionAmount);
    if (!activeGoal) { setError('Choose a goal first.'); return; }
    if (amount === null) { setError('Enter a contribution greater than ₹0.'); return; }
    const result = store.contributeToGoal(activeGoal.id, amount);
    if (result.error) { setError(result.error); return; }
    setContributionAmount(''); setError(''); setContributeModal(null);
  };
  const totalSaved = store.goals.reduce((total, goal) => total + getGoalSavedAmount(goal, store), 0);
  const totalTargets = store.goals.reduce((total, goal) => total + goal.targetAmount, 0);
  const onTrackCount = store.goals.filter((goal) => ['Complete', 'On track'].includes(getGoalStatus(goal, store))).length;
  const riskCount = store.goals.filter((goal) => ['At risk', 'Off track'].includes(getGoalStatus(goal, store))).length;

  return <div className="space-y-6">
    <PageHeading eyebrow="Goals" title="Make a future plan feel real." description="Track what matters, reserve the money gently, and see whether today’s choices keep your goal on pace." action={<Button onClick={openNew}><Plus size={17} /> Create a goal</Button>} />

    <div className="grid gap-4 sm:grid-cols-3"><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><PiggyBank size={15} className="text-emerald-500" /> Saved toward goals</div><div className="mt-3 text-2xl font-black">{inr(totalSaved)}</div><div className="mt-1 text-xs text-[var(--muted)]">Across {store.goals.length} active goals</div></Card><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Target size={15} className="text-violet-500" /> Target total</div><div className="mt-3 text-2xl font-black">{inr(totalTargets)}</div><div className="mt-1 text-xs text-[var(--muted)]">{totalTargets ? Math.round((totalSaved / totalTargets) * 100) : 0}% of all targets saved</div></Card><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><CalendarClock size={15} className="text-amber-500" /> Goal health</div><div className="mt-3 text-2xl font-black">{onTrackCount}<span className="ml-1 text-sm font-medium text-[var(--muted)]">on track</span></div><div className="mt-1 text-xs text-[var(--muted)]">{riskCount} need attention · {inr(metrics.goalReserve)} reserved this month</div></Card></div>

    {store.goals.length ? <div className="grid gap-4 lg:grid-cols-2">{store.goals.map((goal, index) => {
      const saved = getGoalSavedAmount(goal, store);
      const progress = Math.min(100, (saved / Math.max(1, goal.targetAmount)) * 100);
      const status = getGoalStatus(goal, store);
      const remaining = Math.max(0, goal.targetAmount - saved);
      const dayRemaining = Math.max(0, goal.deadlineDay - store.currentDay + 1);
      const suggestedDaily = dayRemaining > 0 ? remaining / dayRemaining : remaining;
      const tone = status === 'Complete' || status === 'On track' ? 'green' : status === 'At risk' ? 'amber' : 'red';
      const gradient = index % 3 === 0 ? 'from-violet-500/10 to-cyan-400/5' : index % 3 === 1 ? 'from-emerald-500/10 to-teal-400/5' : 'from-amber-500/10 to-orange-400/5';
      return <Card key={goal.id} className={`bg-gradient-to-br ${gradient}`}>
        <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--panel)] text-violet-500 shadow-sm"><Flag size={20} /></div><div className="min-w-0"><h2 className="truncate text-lg font-bold">{goal.title}</h2><div className="mt-1 flex flex-wrap items-center gap-2"><Badge tone={tone}>{status}</Badge><Badge>{goal.priority} priority</Badge></div></div></div><div className="flex gap-1"><button onClick={() => openEdit(goal)} aria-label={`Edit ${goal.title}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--soft)] hover:text-violet-500"><PencilLine size={15} /></button><button onClick={() => { if (window.confirm(`Delete “${goal.title}”? In-runway contributions will return to your balance.`)) store.deleteGoal(goal.id); }} aria-label={`Delete ${goal.title}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-500"><Trash2 size={15} /></button></div></div>
        <div className="mt-6 flex items-end justify-between gap-3"><div><div className="text-xs text-[var(--muted)]">Amount saved</div><div className="mt-1 text-2xl font-black tracking-tight">{inr(saved)}</div></div><div className="text-right"><div className="text-xs text-[var(--muted)]">Target</div><div className="mt-1 text-lg font-bold">{inr(goal.targetAmount)}</div></div></div>
        <div className="mt-4"><ProgressBar value={progress} label={`${goal.title} savings progress`} tone={status === 'Off track' ? 'red' : status === 'At risk' ? 'amber' : 'gradient'} className="h-2.5" /><div className="mt-2 flex justify-between text-[11px] text-[var(--muted)]"><span>{Math.round(progress)}% complete</span><span>{inr(remaining)} to go</span></div></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/70 p-3"><div className="text-[11px] text-[var(--muted)]">Deadline</div><div className="mt-1 font-semibold">Day {goal.deadlineDay}</div><div className="mt-0.5 text-[10px] text-[var(--muted)]">{dayRemaining > 0 ? `${dayRemaining} days left` : 'Deadline reached'}</div></div><div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/70 p-3"><div className="text-[11px] text-[var(--muted)]">Needed to stay on pace</div><div className="mt-1 font-semibold">{inr(Math.max(0, suggestedDaily))}<span className="text-xs font-medium text-[var(--muted)]">/day</span></div><div className="mt-0.5 text-[10px] text-[var(--muted)]">Planned: {inr(goal.monthlyContribution)}/cycle</div></div></div>
        <Button className="mt-4 w-full" onClick={() => { setContributeModal(goal.id); setContributionAmount(''); setError(''); }} disabled={remaining <= 0 || calculateBalance(store) <= 0}>{remaining <= 0 ? 'Goal reached — nice work' : 'Add a contribution'} <ArrowRight size={15} /></Button>
      </Card>;
    })}</div> : <Card><EmptyState icon={<Target size={23} />} title="Your goals start here" description="Name something you care about — a trip, new laptop, emergency buffer — and let the money plan keep you honest." action={<Button onClick={openNew}><Plus size={15} /> Create your first goal</Button>} /></Card>}

    <Card className="border-violet-500/15 bg-gradient-to-r from-violet-500/[.07] to-cyan-400/[.035]"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500"><Sparkles size={18} /></div><div><h3 className="font-bold">Goals affect the allowance, not just the vibes.</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">Runway reserves a capped portion of the remaining budget for planned goal contributions after upcoming bills. When you actually contribute, that money moves out of your available balance and into the goal, instantly changing the forecast and financial health score.</p></div></div></Card>

    <Modal open={goalModal} onClose={() => setGoalModal(false)} title={editId ? 'Edit goal' : 'Create a savings goal'} description="A clear target makes trade-offs much easier to see.">
      <div className="space-y-4"><Field label="Goal name"><Input value={title} onChange={(event) => { setTitle(event.target.value); setError(''); }} maxLength={48} placeholder="e.g. Goa trip, emergency fund" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Target amount (₹)"><Input type="number" min="1" max="10000000" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="3000" /></Field><Field label="Already saved (₹)" hint={editId ? 'Baseline saved before this runway.' : 'Money saved before Day 1.'}><Input type="number" min="0" max="10000000" value={savedAmount} onChange={(event) => setSavedAmount(event.target.value)} disabled={Boolean(editId)} /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Planned monthly contribution (₹)"><Input type="number" min="1" max="10000000" value={monthlyContribution} onChange={(event) => setMonthlyContribution(event.target.value)} /></Field><Field label="Deadline day"><Select value={deadlineDay} onChange={(event) => setDeadlineDay(event.target.value)}>{Array.from({ length: 30 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Day {index + 1}</option>)}</Select></Field></div><Field label="Priority"><Select value={priority} onChange={(event) => setPriority(event.target.value as GoalPriority)}><option value="High">High — really matters</option><option value="Medium">Medium — would be nice</option><option value="Low">Low — flexible</option></Select></Field>{error && <InlineNotice tone="warning">{error}</InlineNotice>}<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setGoalModal(false)}>Cancel</Button><Button className="flex-1" onClick={saveGoal}>{editId ? 'Save goal' : 'Create goal'}</Button></div></div>
    </Modal>

    <Modal open={Boolean(contributeModal)} onClose={() => setContributeModal(null)} title={activeGoal ? `Contribute to ${activeGoal.title}` : 'Add contribution'} description="A contribution reduces spendable cash now and increases goal savings. The forecast updates right away.">
      <div className="space-y-4"><div className="rounded-xl bg-[var(--soft)] p-3"><div className="text-xs text-[var(--muted)]">Available balance</div><div className="mt-1 text-xl font-bold">{inr(calculateBalance(store))}</div><div className="mt-1 text-xs text-[var(--muted)]">Goal reserve already planned: {inr(metrics.goalReserve)}</div></div><Field label="Contribution amount (₹)"><Input type="number" min="1" max="10000000" value={contributionAmount} onChange={(event) => { setContributionAmount(event.target.value); setError(''); }} placeholder="250" /></Field>{error && <InlineNotice tone="warning">{error}</InlineNotice>}<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setContributeModal(null)}>Not now</Button><Button className="flex-1" onClick={saveContribution}>Move money</Button></div></div>
    </Modal>
  </div>;
}
