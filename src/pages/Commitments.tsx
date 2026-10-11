import { useState } from 'react';
import { CalendarClock, Check, CirclePause, CirclePlay, CreditCard, Plus, ShieldAlert, Trash2, Zap, ReceiptText, ArrowRight, CalendarDays } from 'lucide-react';
import { Button, Badge, Card, EmptyState, Field, Input, Modal, PageHeading, Select, ProgressBar, InlineNotice } from '../components/ui';
import { inr, safePositiveAmount } from '../lib/format';
import { calculateMetrics, getUpcomingItems } from '../lib/finance';
import { useFinanceStore } from '../store/useFinanceStore';

export default function Commitments() {
  const store = useFinanceStore();
  const metrics = calculateMetrics(store);
  const [modalType, setModalType] = useState<'commitment' | 'subscription' | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(String(Math.min(30, store.currentDay + 1)));
  const [error, setError] = useState('');

  const openModal = (type: 'commitment' | 'subscription') => {
    setModalType(type); setTitle(''); setAmount(''); setDay(String(Math.min(30, store.currentDay + 1))); setError('');
  };
  const save = () => {
    const value = safePositiveAmount(amount);
    const dueDay = Number(day);
    if (!title.trim()) { setError('Give this item a name.'); return; }
    if (value === null) { setError('Enter an amount greater than ₹0.'); return; }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 30) { setError('Choose a day between 1 and 30.'); return; }
    if (modalType === 'commitment') store.addCommitment({ title: title.trim(), amount: value, dueDay });
    if (modalType === 'subscription') store.addSubscription({ name: title.trim(), amount: value, billingDay: dueDay, active: true });
    setModalType(null);
  };
  const upcoming = getUpcomingItems(store);
  const totalActiveSubscriptionCost = store.subscriptions.filter((item) => item.active).reduce((total, item) => total + item.amount, 0);
  const cancelSavings = (subscription: typeof store.subscriptions[number]) => subscription.active && subscription.billingDay > store.currentDay ? subscription.amount : 0;
  const highestFutureSubscription = store.subscriptions.filter((item) => item.active && item.billingDay > store.currentDay).sort((a, b) => b.amount - a.amount)[0];

  return <div className="space-y-6">
    <PageHeading eyebrow="Commitments & subscriptions" title="Protect the money already spoken for." description="Rent share, phone recharge, subscriptions — put the fixed stuff on the map so flexible spending stays honest." action={<div className="flex gap-2"><Button variant="outline" onClick={() => openModal('commitment')}><Plus size={16} /> Commitment</Button><Button onClick={() => openModal('subscription')}><Plus size={16} /> Subscription</Button></div>} />

    <div className="grid gap-4 sm:grid-cols-3"><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><CalendarClock size={15} className="text-amber-500" /> Upcoming obligations</div><div className="mt-3 text-2xl font-black">{inr(metrics.upcomingObligations)}</div><div className="mt-1 text-xs text-[var(--muted)]">{upcoming.length} future item{upcoming.length !== 1 ? 's' : ''} protected</div></Card><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Zap size={15} className="text-violet-500" /> Active subs / cycle</div><div className="mt-3 text-2xl font-black">{inr(totalActiveSubscriptionCost)}</div><div className="mt-1 text-xs text-[var(--muted)]">{store.subscriptions.filter((item) => item.active).length} subscriptions running</div></Card><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldAlert size={15} className="text-rose-500" /> Budget at stake</div><div className="mt-3 text-2xl font-black">{metrics.balance > 0 ? Math.round((metrics.upcomingObligations / metrics.balance) * 100) : 100}%</div><div className="mt-2"><ProgressBar value={metrics.balance > 0 ? Math.min(100, (metrics.upcomingObligations / metrics.balance) * 100) : 100} tone={metrics.upcomingObligations / Math.max(1, metrics.balance) > 0.35 ? 'amber' : 'green'} /></div></Card></div>

    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Card>
        <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-amber-500">Non-negotiables</div><h2 className="mt-1 text-lg font-bold">Commitments</h2><p className="mt-1 text-xs text-[var(--muted)]">Due dates automatically charge when you move through the month.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><ReceiptText size={18} /></div></div>
        <div className="mt-4 space-y-3">{store.commitments.length ? store.commitments.slice().sort((a, b) => a.dueDay - b.dueDay).map((item) => {
          const complete = item.paid && !item.skipped;
          const overdue = !complete && !item.skipped && item.dueDay < store.currentDay;
          return <div key={item.id} className="rounded-2xl border border-[var(--border)] p-3.5">
            <div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${complete ? 'bg-emerald-500/10 text-emerald-500' : item.skipped ? 'bg-slate-500/10 text-[var(--muted)]' : 'bg-amber-500/10 text-amber-500'}`}><CalendarDays size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{item.title}</span>{complete ? <Badge tone="green">Paid</Badge> : item.skipped ? <Badge>Skipped</Badge> : overdue ? <Badge tone="red">Overdue</Badge> : <Badge tone="amber">Day {item.dueDay}</Badge>}</div><div className="mt-1 text-xs text-[var(--muted)]">{complete && item.autoPaidDay ? `Auto-paid on Day ${item.autoPaidDay}` : `Due on Day ${item.dueDay}`}</div></div><div className="text-sm font-bold">{inr(item.amount)}</div></div>
            <div className="mt-3 flex flex-wrap gap-2">{!complete && !item.skipped && <><Button variant="secondary" size="sm" onClick={() => store.updateCommitment(item.id, { paid: true, skipped: false, autoPaidDay: undefined })}><Check size={14} /> Mark paid</Button><Button variant="outline" size="sm" onClick={() => store.updateCommitment(item.id, { skipped: true, paid: false, autoPaidDay: undefined })}>Skip commitment</Button></>}{(complete || item.skipped) && <Button variant="ghost" size="sm" onClick={() => store.updateCommitment(item.id, { paid: false, skipped: false, autoPaidDay: undefined })}>Reopen</Button>}<Button variant="ghost" size="sm" className="ml-auto text-rose-500" onClick={() => { if (window.confirm(`Delete ${item.title}? The forecast and balance will recalculate.`)) store.deleteCommitment(item.id); }}><Trash2 size={14} /> Delete</Button></div>
          </div>;
        }) : <EmptyState icon={<CalendarClock size={22} />} title="No commitments yet" description="Add fixed costs to keep your daily allowance realistic." action={<Button onClick={() => openModal('commitment')}><Plus size={15} /> Add a commitment</Button>} />}</div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[.15em] text-violet-500">Recurring charges</div><h2 className="mt-1 text-lg font-bold">Subscriptions</h2><p className="mt-1 text-xs text-[var(--muted)]">Pause a future bill to free up money this cycle.</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500"><CreditCard size={18} /></div></div>
        <div className="mt-4 space-y-3">{store.subscriptions.length ? store.subscriptions.slice().sort((a, b) => a.billingDay - b.billingDay).map((item) => {
          const savings = cancelSavings(item);
          const risky = item.active && item.amount >= 0.08 * Math.max(1, metrics.safeDailyAllowance * metrics.daysLeft);
          return <div key={item.id} className={`rounded-2xl border p-3.5 ${risky ? 'border-amber-500/20 bg-amber-500/[.035]' : 'border-[var(--border)]'}`}>
            <div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.active ? 'bg-violet-500/10 text-violet-500' : 'bg-[var(--soft)] text-[var(--muted)]'}`}><Zap size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{item.name}</span>{item.active ? <Badge tone="green">Active</Badge> : <Badge>Paused</Badge>}{risky && <Badge tone="amber">Budget watch</Badge>}</div><div className="mt-1 text-xs text-[var(--muted)]">{item.billingDay > store.currentDay ? `Next bill Day ${item.billingDay}` : item.billingDay === store.currentDay ? 'Bills today' : 'Billed earlier this cycle'}</div>{savings > 0 && <div className="mt-1 text-[11px] font-semibold text-emerald-500">Pause now → save {inr(savings)} by Day 30</div>}</div><div className="text-sm font-bold">{inr(item.amount)}</div></div>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant={item.active ? 'secondary' : 'outline'} size="sm" onClick={() => store.toggleSubscription(item.id)}>{item.active ? <><CirclePause size={14} /> Pause</> : <><CirclePlay size={14} /> Resume</>}</Button><Button variant="ghost" size="sm" className="ml-auto text-rose-500" onClick={() => { if (window.confirm(`Remove ${item.name}? Past charges will remain in history.`)) store.deleteSubscription(item.id); }}><Trash2 size={14} /> Remove</Button></div>
          </div>;
        }) : <EmptyState icon={<CreditCard size={22} />} title="No subscriptions running" description="Add any recurring charge so the forecast knows what’s coming." action={<Button onClick={() => openModal('subscription')}><Plus size={15} /> Add subscription</Button>} />}</div>
        {highestFutureSubscription && <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/[.05] p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500"><ShieldAlert size={14} /> A useful trade-off</div><div className="mt-2 text-sm font-semibold">Pausing {highestFutureSubscription.name} frees {inr(highestFutureSubscription.amount)}.</div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">That’s money you can keep for your goals or unexpected expenses. Your forecast changes as soon as you pause it.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => store.toggleSubscription(highestFutureSubscription.id)}>Pause {highestFutureSubscription.name} <ArrowRight size={14} /></Button></div>}
      </Card>
    </div>

    <Card><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500"><CalendarClock size={18} /></div><div><h3 className="font-bold">What counts as protected money?</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">The safe daily allowance subtracts unpaid commitments, future active subscription bills and a capped reserve for planned goal contributions before dividing what remains by days left. Mark a bill paid only when you have actually paid it; day simulation automatically charges items due on that day.</p></div></div></Card>

    <Modal open={modalType !== null} onClose={() => setModalType(null)} title={modalType === 'commitment' ? 'Add a commitment' : 'Add a subscription'} description={modalType === 'commitment' ? 'Fixed costs deserve a reserved spot in the plan.' : 'Recurring charges should never arrive as a surprise.'}>
      <div className="space-y-4"><Field label={modalType === 'commitment' ? 'Commitment name' : 'Subscription name'}><Input value={title} onChange={(event) => { setTitle(event.target.value); setError(''); }} placeholder={modalType === 'commitment' ? 'e.g. Hostel fees' : 'e.g. Music app'} maxLength={64} /></Field><Field label="Amount (₹)"><Input type="number" min="1" max="10000000" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setError(''); }} placeholder="0" /></Field><Field label={modalType === 'commitment' ? 'Due day' : 'Billing day'}><Select value={day} onChange={(event) => setDay(event.target.value)}>{Array.from({ length: 30 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Day {index + 1}{index + 1 === store.currentDay ? ' · Today' : ''}</option>)}</Select></Field>{error && <InlineNotice tone="warning">{error}</InlineNotice>}<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setModalType(null)}>Cancel</Button><Button className="flex-1" onClick={save}>Add to runway</Button></div></div>
    </Modal>
  </div>;
}
