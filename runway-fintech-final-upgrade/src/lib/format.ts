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


export const sanitizeText = (value: unknown, maxLength = 64): string => {
  if (typeof value !== 'string' || !Number.isInteger(maxLength) || maxLength < 1) return '';
  const normalized = value.normalize('NFKC');
  const cleaned = Array.from(normalized, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) ? ' ' : character;
  }).join('');

  return cleaned.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

export const safePositiveAmount = (raw: string | number): number | null => {
  const amount = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return null;
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  return rounded > 0 ? rounded : null;
};

export const dayLabel = (day: number): string => `Day ${day}`;
