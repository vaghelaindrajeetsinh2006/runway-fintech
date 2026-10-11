import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import type { FinanceData } from '../types';
import { inr } from '../lib/format';

// Recharts is kept in an async module and is not requested until its chart is near the viewport.
// This lets the dashboard text and decision controls render before the charting code downloads.
const ForecastImplementation = lazy(() => import('./ChartsImpl').then((module) => ({ default: module.ForecastChart })));
const DonutImplementation = lazy(() => import('./ChartsImpl').then((module) => ({ default: module.CategoryDonut })));
const CompareImplementation = lazy(() => import('./ChartsImpl').then((module) => ({ default: module.DecisionCompareChart })));
const BarsImplementation = lazy(() => import('./ChartsImpl').then((module) => ({ default: module.DailySpendBars })));

function ChartPlaceholder({ label }: { label: string }) {
  return <div className="flex h-full w-full flex-col justify-center gap-3 px-5" role="status" aria-label={`${label} loading`}>
    <span className="sr-only">The {label.toLowerCase()} will appear when it is ready.</span>
    <div className="h-2 w-1/3 animate-pulse rounded bg-[var(--soft)]" />
    <div className="flex h-3/4 items-end gap-2" aria-hidden="true">
      {[32, 52, 42, 70, 58, 82, 65, 92, 71, 84, 60, 76].map((height, index) => <span key={index} className="flex-1 animate-pulse rounded-t-md bg-violet-500/10" style={{ height: `${height}%`, animationDelay: `${index * 35}ms` }} />)}
    </div>
  </div>;
}

function ChartGate({ label, heightClass, children }: { label: string; heightClass: string; children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!('IntersectionObserver' in window) || host.getBoundingClientRect().top <= window.innerHeight + 240) {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px 0px' });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return <div ref={hostRef} className={`min-w-0 overflow-hidden ${heightClass}`} aria-busy={!shouldLoad}>
    {shouldLoad ? <Suspense fallback={<ChartPlaceholder label={label} />}>{children}</Suspense> : <ChartPlaceholder label={label} />}
  </div>;
}

export function ForecastChart({ data, compare, compact = false }: { data: FinanceData; compare?: FinanceData; compact?: boolean }) {
  return <ChartGate label="Balance forecast" heightClass={compact ? 'h-44' : 'h-72'}><ForecastImplementation data={data} compare={compare} compact={compact} /></ChartGate>;
}

export function CategoryDonut({ data, compact = false }: { data: FinanceData; compact?: boolean }) {
  return <ChartGate label="Spending by category" heightClass={compact ? 'h-44' : 'h-64'}><DonutImplementation data={data} compact={compact} /></ChartGate>;
}

export function DecisionCompareChart({ before, after }: { before: FinanceData; after: FinanceData }) {
  return <ChartGate label="Before and after decision forecast" heightClass="h-64"><CompareImplementation before={before} after={after} /></ChartGate>;
}

export function DailySpendBars({ data }: { data: FinanceData }) {
  return <ChartGate label="Daily spending" heightClass="h-56"><BarsImplementation data={data} /></ChartGate>;
}

const chartColors = ['#8b5cf6', '#22d3ee', '#f59e0b', '#fb7185', '#34d399', '#60a5fa', '#c084fc', '#94a3b8'];
export function CategoryLegend({ data }: { data: FinanceData }) {
  const totals = data.expenses.filter((item) => item.day <= data.currentDay).reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + item.amount;
    return result;
  }, {});
  const rows = Object.entries(totals).map(([name, value]) => ({ name, value, color: chartColors[0] })).sort((a, b) => b.value - a.value).map((row, index) => ({ ...row, color: chartColors[index % chartColors.length] }));
  if (!rows.length) return <div className="space-y-2 text-xs leading-5 text-[var(--muted)]">No spending has been logged yet. Add an expense to create your category breakdown.</div>;
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return <div className="space-y-3" aria-label="Spending category legend">{rows.slice(0, 6).map((row) => <div key={row.name} className="flex items-center justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} /><span className="truncate text-[var(--muted)]">{row.name}</span></div><span className="shrink-0 text-right"><span className="block font-semibold text-[var(--text)]">{inr(row.value)}</span><span className="text-[10px] text-[var(--muted)]">{Math.round((row.value / Math.max(1, total)) * 100)}%</span></span></div>)}</div>;
}
