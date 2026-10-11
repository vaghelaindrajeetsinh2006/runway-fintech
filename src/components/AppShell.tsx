import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, ArrowLeftRight, BarChart3, CalendarDays, ChevronDown, Compass, CreditCard,
  Home, Lightbulb, Menu, Moon, MoreHorizontal, PiggyBank, RotateCcw, Sun, Wallet, X,
} from 'lucide-react';
import { inr } from '../lib/format';
import { calculateMetrics } from '../lib/finance';
import { useFinanceStore } from '../store/useFinanceStore';
import { Button, IconButton, ToastNotice } from './ui';

const navItems = [
  { to: '/', label: 'Overview', icon: Home, mobile: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, mobile: true },
  { to: '/commitments', label: 'Commitments', icon: CreditCard, mobile: false },
  { to: '/goals', label: 'Savings goals', icon: PiggyBank, mobile: true },
  { to: '/decision-lab', label: 'Decision Lab', icon: Lightbulb, mobile: true },
  { to: '/insights', label: 'Insights', icon: BarChart3, mobile: false },
];

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Your runway', subtitle: 'A little clarity goes a long way.' },
  '/transactions': { title: 'Money in motion', subtitle: 'Every rupee has a story.' },
  '/commitments': { title: 'Commitments', subtitle: 'Know what future-you already owes.' },
  '/goals': { title: 'Goals worth saving for', subtitle: 'Tiny moves. Future-you says thanks.' },
  '/decision-lab': { title: 'Decision Lab', subtitle: 'Try the money move before you make it.' },
  '/insights': { title: 'Money patterns', subtitle: 'Your habits, minus the judgment.' },
  '/summary': { title: 'Month-end recap', subtitle: 'Thirty days, one clearer money story.' },
};

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const store = useFinanceStore();
  const currentDay = store.currentDay;
  const profile = store.profile;
  const theme = store.theme;
  const setTheme = store.setTheme;
  const resetDemo = store.resetDemoData;
  const metrics = calculateMetrics(store);
  const meta = routeMeta[location.pathname] ?? routeMeta['/'];

  useEffect(() => setMoreOpen(false), [location.pathname]);

  const onReset = () => {
    const okay = window.confirm('Restore the Runway demo scenario? Your current entries will be replaced. You can undo immediately after reset.');
    if (okay) resetDemo();
  };

  const Brand = () => <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-xl">
    <span className="brand-mark"><Compass size={21} strokeWidth={2.4} /></span>
    <span><span className="block text-lg font-black tracking-tight text-[var(--text)]">runway<span className="text-violet-500">.</span></span><span className="block text-[9px] font-bold uppercase tracking-[.19em] text-[var(--muted)]">money, in motion</span></span>
  </button>;

  return <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[var(--border)] bg-[var(--sidebar)] px-4 py-6 lg:flex">
      <div className="px-2"><Brand /></div>
      <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--muted)]">Workspace</div>
      <nav aria-label="Main navigation" className="mt-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return <NavLink key={item.to} end={item.to === '/'} to={item.to} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <Icon size={18} strokeWidth={1.9} /><span>{item.label}</span>{item.to === '/decision-lab' && <span className="ml-auto h-2 w-2 rounded-full bg-cyan-400" />}
          </NavLink>;
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-cyan-400/5 p-4">
          <div className="flex items-center justify-between"><span className="text-xs font-medium text-[var(--muted)]">Safe today</span><Wallet size={15} className="text-violet-500" /></div>
          <div className="mt-2 text-2xl font-black tracking-tight">{inr(metrics.safeDailyAllowance)}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)]"><span>Day {currentDay} of 30</span><span>{Math.round((currentDay / 30) * 100)}%</span></div>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--soft)]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${(currentDay / 30) * 100}%` }} /></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black text-white">{profile.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{profile.name}</div><div className="text-[11px] text-[var(--muted)]">30-day money sprint</div></div>
          <IconButton label="Reset demo data" className="h-9 w-9" onClick={onReset}><RotateCcw size={15} /></IconButton>
        </div>
      </div>
    </aside>

    <div className="lg:pl-[248px]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-9">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden"><Brand /></div>
            <div className="hidden min-w-0 lg:block"><div className="text-lg font-bold tracking-tight">{meta.title}</div><p className="mt-0.5 text-xs text-[var(--muted)]">{meta.subtitle}</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 sm:flex"><CalendarDays size={14} className="text-violet-500" /><span className="text-xs font-semibold">Day {currentDay}<span className="text-[var(--muted)]"> / 30</span></span></div>
            <IconButton label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="border border-[var(--border)] bg-[var(--panel)]">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</IconButton>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={onReset}><RotateCcw size={14} /> Reset demo</Button>
            <button onClick={() => setMoreOpen((value) => !value)} aria-label={moreOpen ? 'Close quick navigation' : 'Open quick navigation'} aria-expanded={moreOpen} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] lg:hidden">{moreOpen ? <X size={18} /> : <MoreHorizontal size={19} />}</button>
          </div>
        </div>
        <div className="mt-3 lg:hidden"><div className="text-base font-bold tracking-tight">{meta.title}</div><div className="text-xs text-[var(--muted)]">{meta.subtitle}</div></div>
      </header>

      <AnimatePresence>
        {moreOpen && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="fixed inset-x-3 top-[76px] z-50 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-2xl lg:hidden">
          <div className="grid grid-cols-2 gap-2">{navItems.map((item) => { const Icon = item.icon; return <button key={item.to} onClick={() => { navigate(item.to); setMoreOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)]"><Icon size={16} />{item.label}</button>; })}<button onClick={() => { navigate('/summary'); setMoreOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)]"><Activity size={16} />Month recap</button></div>
          <button onClick={onReset} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-500 hover:bg-rose-500/10"><RotateCcw size={16} />Reset to demo data</button>
        </motion.div>}
      </AnimatePresence>

      <main className="page-frame mx-auto max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-9 lg:pb-10">
        <Outlet />
      </main>
    </div>

    <nav aria-label="Mobile navigation" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--panel)]/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-2 backdrop-blur-xl lg:hidden">
      {[navItems[0], navItems[1], navItems[4], navItems[3], { to: '/commitments', label: 'More', icon: Menu, mobile: true }].map((item) => {
        const Icon = item.icon;
        if (item.label === 'More') return <button key={item.label} onClick={() => setMoreOpen((value) => !value)} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${moreOpen || location.pathname === '/commitments' || location.pathname === '/insights' ? 'text-violet-500' : 'text-[var(--muted)]'}`}><Icon size={19} /><span>More</span></button>;
        return <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${isActive ? 'text-violet-500' : 'text-[var(--muted)]'}`}><Icon size={19} /><span>{item.label === 'Decision Lab' ? 'Lab' : item.label === 'Transactions' ? 'Activity' : item.label}</span></NavLink>;
      })}
    </nav>
    <ToastNotice />
  </div>;
}
