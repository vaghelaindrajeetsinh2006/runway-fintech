import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import type { FinanceData, ForecastPoint } from '../types';
import { calculateMetrics } from '../lib/finance';
import { inr } from '../lib/format';

const chartColors = ['#8b5cf6', '#22d3ee', '#f59e0b', '#fb7185', '#34d399', '#60a5fa', '#c084fc', '#94a3b8'];
const axisColor = 'var(--muted)';

const MoneyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><div className="text-xs text-[var(--muted)]">{label}</div>{payload.map((item: any) => <div key={item.dataKey} className="mt-1 text-sm font-semibold" style={{ color: item.color }}>{item.name}: {inr(Number(item.value))}</div>)}</div>;
};

export function ForecastChart({ data, compare, compact = false }: { data: FinanceData; compare?: FinanceData; compact?: boolean }) {
  const metrics = calculateMetrics(data);
  const compareMetrics = compare ? calculateMetrics(compare) : undefined;
  const rows = metrics.forecast.map((point) => ({
    day: `D${point.day}`,
    actual: point.projected ? undefined : point.balance,
    forecast: point.projected ? point.balance : undefined,
    after: compareMetrics?.forecast.find((item) => item.day === point.day)?.balance,
  }));
  return <div className={compact ? 'h-44 w-full' : 'h-72 w-full'} role="img" aria-label={compare ? 'Projected balance before and after a decision' : 'Balance forecast from today through day 30'}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="runwayForecastFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} interval={compact ? 5 : 2} />
        <YAxis tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => value < 0 ? `-${Math.abs(value / 1000).toFixed(1)}k` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${Math.round(value)}`} width={37} />
        <Tooltip content={<MoneyTooltip />} />
        <Area type="monotone" dataKey="actual" name="Current balance" stroke="#22d3ee" strokeWidth={2.5} fill="url(#runwayForecastFill)" connectNulls />
        <Area type="monotone" dataKey="forecast" name="Projected balance" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="5 4" fill="url(#runwayForecastFill)" connectNulls />
        {compare && <Area type="monotone" dataKey="after" name="After decision" stroke="#34d399" strokeWidth={2.5} strokeDasharray="3 3" fill="transparent" connectNulls />}
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export function CategoryDonut({ data, compact = false }: { data: FinanceData; compact?: boolean }) {
  const totals = data.expenses.filter((item) => item.day <= data.currentDay).reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + item.amount;
    return result;
  }, {});
  const rows = Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  if (!rows.length) return <div className="flex h-48 items-center justify-center text-sm text-[var(--muted)]">Add a few expenses to see your spending mix.</div>;
  return <div className={compact ? 'h-44' : 'h-64'} role="img" aria-label={`Spending by category: ${rows.map((row) => `${row.name} ${Math.round(row.value)}`).join(', ')}`}>
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={compact ? 42 : 58} outerRadius={compact ? 66 : 94} paddingAngle={3} stroke="none">
          {rows.map((row, index) => <Cell key={row.name} fill={chartColors[index % chartColors.length]} />)}
        </Pie>
        <Tooltip content={<MoneyTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  </div>;
}

export function CategoryLegend({ data }: { data: FinanceData }) {
  const totals = data.expenses.filter((item) => item.day <= data.currentDay).reduce<Record<string, number>>((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + item.amount;
    return result;
  }, {});
  const rows = Object.entries(totals).map(([name, value], index) => ({ name, value, color: chartColors[index % chartColors.length] })).sort((a, b) => b.value - a.value);
  return <div className="space-y-3">{rows.slice(0, 6).map((row) => <div key={row.name} className="flex items-center justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} /><span className="truncate text-[var(--muted)]">{row.name}</span></div><span className="font-semibold text-[var(--text)]">{inr(row.value)}</span></div>)}</div>;
}

export function DecisionCompareChart({ before, after }: { before: FinanceData; after: FinanceData }) {
  const beforePoints = calculateMetrics(before).forecast;
  const afterPoints = calculateMetrics(after).forecast;
  const rows: Array<{ day: string; before: number; after: number }> = beforePoints.map((point: ForecastPoint) => ({
    day: `D${point.day}`, before: point.balance, after: afterPoints.find((candidate) => candidate.day === point.day)?.balance ?? point.balance,
  }));
  return <div className="h-64 w-full" role="img" aria-label="Two-line chart comparing the projected balance before and after the proposed decision">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
        <YAxis tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${Math.round(value)}`} width={36} />
        <Tooltip content={<MoneyTooltip />} />
        <Line dataKey="before" name="Before" type="monotone" stroke="#94a3b8" strokeWidth={2.5} dot={false} />
        <Line dataKey="after" name="After decision" type="monotone" stroke="#8b5cf6" strokeWidth={2.8} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}

export function DailySpendBars({ data }: { data: FinanceData }) {
  const rows = Array.from({ length: data.currentDay }, (_, index) => {
    const day = index + 1;
    const spend = data.expenses.filter((item) => item.day === day).reduce((total, item) => total + item.amount, 0);
    return { day: `D${day}`, spend };
  });
  return <div className="h-56 w-full" role="img" aria-label="Daily expenses for elapsed days">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value} width={36} />
        <Tooltip content={<MoneyTooltip />} />
        <Bar dataKey="spend" name="Spend" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
