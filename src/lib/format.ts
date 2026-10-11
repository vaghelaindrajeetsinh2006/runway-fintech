export const inr = (amount: number, compact = false): string => {
  if (!Number.isFinite(amount)) return '—';
  const safeAmount = Math.abs(amount) < 1 ? 0 : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(safeAmount);
};

export const numberIN = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0);

export const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

export const makeId = (prefix = 'item'): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const safePositiveAmount = (raw: string | number): number | null => {
  const amount = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return null;
  return Math.round(amount * 100) / 100;
};

export const dayLabel = (day: number): string => `Day ${day}`;
