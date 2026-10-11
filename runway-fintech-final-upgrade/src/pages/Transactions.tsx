import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Filter, Plus, Search, Trash2, PencilLine, ReceiptText } from 'lucide-react';
import { Button, Badge, Card, EmptyState, Field, Input, Modal, PageHeading, Select, InlineNotice } from '../components/ui';
import { CategoryDonut, CategoryLegend } from '../components/Charts';
import { inr, safePositiveAmount } from '../lib/format';
import { calculateBalance } from '../lib/finance';
import { useFinanceStore } from '../store/useFinanceStore';
import type { ExpenseCategory, ExpenseEntry, ExpenseType, IncomeEntry } from '../types';

const categories: ExpenseCategory[] = ['Food', 'Travel', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other'];
const emoji: Record<ExpenseCategory, string> = { Food: '🥑', Travel: '🚌', Shopping: '🛍️', Entertainment: '🎟️', Bills: '🧾', Health: '🫶', Education: '📚', Other: '✦' };

type TransactionKind = 'expense' | 'income';
type TransactionRow = ({ kind: 'expense'; item: ExpenseEntry }) | ({ kind: 'income'; item: IncomeEntry });

export default function Transactions() {
  const store = useFinanceStore();
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [day, setDay] = useState(String(store.currentDay));
  const [expenseType, setExpenseType] = useState<ExpenseType>('discretionary');
  const [error, setError] = useState('');
  const [confirmLarge, setConfirmLarge] = useState(false);

  const rows: TransactionRow[] = useMemo(() => [
    ...store.expenses.map((item) => ({ kind: 'expense' as const, item })),
    ...store.incomes.map((item) => ({ kind: 'income' as const, item })),
  ].filter((row) => row.kind === kind)
    .filter((row) => row.item.title.toLowerCase().includes(search.toLowerCase().trim()))
    .filter((row) => kind !== 'expense' || categoryFilter === 'all' || (row.item as ExpenseEntry).category === categoryFilter)
    .filter((row) => dayFilter === 'all' || row.item.day === Number(dayFilter))
    .sort((a, b) => b.item.day - a.item.day), [store.expenses, store.incomes, kind, search, categoryFilter, dayFilter]);

  const openAdd = () => {
    setEditId(null); setTitle(''); setAmount(''); setCategory('Food'); setDay(String(store.currentDay)); setExpenseType('discretionary'); setError(''); setConfirmLarge(false); setModalOpen(true);
  };
  const openEdit = (row: TransactionRow) => {
    setEditId(row.item.id); setTitle(row.item.title); setAmount(String(row.item.amount)); setDay(String(row.item.day)); setError(''); setConfirmLarge(false);
    if (row.kind === 'expense') { setCategory(row.item.category); setExpenseType(row.item.type); setKind('expense'); }
    else setKind('income');
    setModalOpen(true);
  };
  const save = () => {
    const positive = safePositiveAmount(amount);
    if (!title.trim()) { setError('Add a transaction description.'); return; }
    if (positive === null) { setError('Amount must be greater than ₹0 and below ₹1,00,00,000.'); return; }
    const selectedDay = Number(day);
    if (!Number.isInteger(selectedDay) || selectedDay < 1 || selectedDay > 30) { setError('Choose a day from 1 to 30.'); return; }
    if (kind === 'expense' && selectedDay <= store.currentDay) {
      const previousExpense = editId ? store.expenses.find((item) => item.id === editId && item.day <= store.currentDay)?.amount ?? 0 : 0;
      const availableBefore = Math.max(0, calculateBalance(store) + previousExpense);
      if (positive > availableBefore && !confirmLarge) {
        setConfirmLarge(true);
        setError('This expense would take your available balance below zero. Confirm if it is unavoidable.');
        return;
      }
    }
    if (kind === 'expense') {
      const fields = { title: title.trim(), amount: positive, category, day: selectedDay, type: expenseType };
      if (editId) store.updateExpense(editId, fields);
      else store.addExpense(fields);
    } else {
      const fields = { title: title.trim(), amount: positive, day: selectedDay };
      if (editId) store.updateIncome(editId, fields);
      else store.addIncome(fields);
    }
    setModalOpen(false); setError('');
  };

  const deleteRow = (row: TransactionRow) => {
    if (!window.confirm(`Delete “${row.item.title}”? The balance and forecast will update.`)) return;
    if (row.kind === 'expense') store.deleteExpense(row.item.id);
    else store.deleteIncome(row.item.id);
  };
  const spent = store.expenses.filter((item) => item.day <= store.currentDay).reduce((total, item) => total + item.amount, 0);
  const incoming = store.incomes.filter((item) => item.day <= store.currentDay).reduce((total, item) => total + item.amount, 0);

  return <div className="space-y-6">
    <PageHeading eyebrow="Transactions" title="Money in motion" description="Log real spending, tag the why, and see every change flow through your runway." action={<Button onClick={openAdd}><Plus size={17} /> Add transaction</Button>} />

    <div className="grid gap-4 sm:grid-cols-3"><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><ArrowDownLeft size={15} className="text-rose-500" /> Spent through Day {store.currentDay}</div><div className="mt-3 text-2xl font-black">{inr(spent)}</div><div className="mt-1 text-xs text-[var(--muted)]">Expenses included in balance</div></Card><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><ArrowUpRight size={15} className="text-emerald-500" /> Income received</div><div className="mt-3 text-2xl font-black">{inr(incoming)}</div><div className="mt-1 text-xs text-[var(--muted)]">Through current day</div></Card><Card><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><ReceiptText size={15} className="text-violet-500" /> Transaction count</div><div className="mt-3 text-2xl font-black">{store.expenses.length + store.incomes.length}</div><div className="mt-1 text-xs text-[var(--muted)]">Across the 30-day plan</div></Card></div>

    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1 rounded-xl bg-[var(--soft)] p-1"><button type="button" aria-pressed={kind === 'expense'} onClick={() => { setKind('expense'); setCategoryFilter('all'); }} className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${kind === 'expense' ? 'bg-[var(--panel)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'}`}>Expenses</button><button type="button" aria-pressed={kind === 'income'} onClick={() => { setKind('income'); setCategoryFilter('all'); }} className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${kind === 'income' ? 'bg-[var(--panel)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'}`}>Income</button></div><Badge>{rows.length} result{rows.length !== 1 ? 's' : ''}</Badge></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_150px_130px]"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" aria-label="Search transactions" /></div><Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} disabled={kind === 'income'} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</Select><Select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)} aria-label="Filter by day"><option value="all">All days</option>{Array.from({ length: 30 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Day {index + 1}</option>)}</Select></div>
        <div className="mt-4 space-y-2">
          {rows.length ? rows.map((row) => {
            const isExpense = row.kind === 'expense';
            const detail = isExpense ? `${emoji[(row.item as ExpenseEntry).category]} ${(row.item as ExpenseEntry).category} · ${(row.item as ExpenseEntry).type === 'unexpected' ? 'Unexpected' : 'Flexible spend'}` : 'Income';
            const future = row.item.day > store.currentDay;
            return <div key={`${row.kind}-${row.item.id}`} className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-[var(--border)] hover:bg-[var(--soft)]/60">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isExpense ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{isExpense ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{row.item.title}</span>{future && <Badge tone="blue">Planned</Badge>}</div><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--muted)]"><span>{detail}</span><span>·</span><span>Day {row.item.day}</span></div></div>
              <div className="text-right"><div className={`text-sm font-bold ${isExpense ? 'text-[var(--text)]' : 'text-emerald-500'}`}>{isExpense ? '−' : '+'}{inr(row.item.amount)}</div><div className="mt-1 flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><button aria-label={`Edit ${row.item.title}`} onClick={() => openEdit(row)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-violet-500/10 hover:text-violet-500"><PencilLine size={14} /></button><button aria-label={`Delete ${row.item.title}`} onClick={() => deleteRow(row)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-500"><Trash2 size={14} /></button></div></div>
            </div>;
          }) : <EmptyState icon={<Filter size={22} />} title="Nothing matches those filters" description="Try a different search, day or category — or add the transaction to start your story." action={<Button variant="secondary" onClick={openAdd}><Plus size={15} /> Add a transaction</Button>} />}
        </div>
      </Card>

      <div className="space-y-5"><Card><div className="text-xs font-bold uppercase tracking-[.15em] text-violet-500">Category mix</div><h2 className="mt-1 text-lg font-bold">Where it went</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Expense categories update from your actual entries, not sample percentages.</p><div className="mt-2"><CategoryDonut data={store} /></div><CategoryLegend data={store} /></Card><Card><div className="flex items-center gap-2"><CalendarDays size={17} className="text-cyan-500" /><h3 className="font-bold">A tiny money rule</h3></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Log transactions on the day they happen. Planned future expenses appear in the list, but they won’t reduce your balance until that day arrives.</p></Card></div>
    </div>

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit transaction' : `Add ${kind}`} description="This entry updates your balance, safe allowance, forecast and health score.">
      <div className="space-y-4"><div className="flex gap-2 rounded-xl bg-[var(--soft)] p-1"><button type="button" aria-pressed={kind === 'expense'} disabled={Boolean(editId)} onClick={() => { setKind('expense'); setError(''); }} className={`min-h-10 disabled:opacity-50 flex-1 rounded-lg text-sm font-semibold ${kind === 'expense' ? 'bg-[var(--panel)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'}`}>Expense</button><button type="button" aria-pressed={kind === 'income'} disabled={Boolean(editId)} onClick={() => { setKind('income'); setError(''); }} className={`min-h-10 disabled:opacity-50 flex-1 rounded-lg text-sm font-semibold ${kind === 'income' ? 'bg-[var(--panel)] text-[var(--text)] shadow-sm' : 'text-[var(--muted)]'}`}>Income</button></div><Field label="Description"><Input value={title} onChange={(event) => { setTitle(event.target.value); setError(''); }} maxLength={64} placeholder="e.g. Lunch, cab, freelance" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Amount (₹)"><Input type="number" inputMode="decimal" min="1" max="10000000" value={amount} onChange={(event) => { setAmount(event.target.value); setConfirmLarge(false); setError(''); }} placeholder="0" /></Field><Field label="Day"><Select value={day} onChange={(event) => setDay(event.target.value)}>{Array.from({ length: 30 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Day {index + 1}{index + 1 === store.currentDay ? ' · Today' : ''}</option>)}</Select></Field></div>{kind === 'expense' && <><Field label="Category"><Select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>{categories.map((item) => <option key={item} value={item}>{emoji[item]} {item}</option>)}</Select></Field><Field label="Expense type"><Select value={expenseType} onChange={(event) => setExpenseType(event.target.value as ExpenseType)}><option value="discretionary">Flexible / discretionary</option><option value="unexpected">Unexpected expense</option></Select></Field></>}{error && <InlineNotice tone={confirmLarge ? 'warning' : 'info'}>{error}</InlineNotice>}<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="flex-1" onClick={save}>{confirmLarge ? 'Confirm entry' : 'Save transaction'}</Button></div></div>
    </Modal>
  </div>;
}
