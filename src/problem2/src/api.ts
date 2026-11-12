import type { PriceEntry, Token } from './types';

const PRICES_URL = 'https://interview.switcheo.com/prices.json';
const ICON_BASE = 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens';

export async function fetchTokens(): Promise<Token[]> {
  const res = await fetch(PRICES_URL);
  if (!res.ok) throw new Error(`Failed to fetch prices (${res.status})`);
  const data: PriceEntry[] = await res.json();

  const latest = new Map<string, PriceEntry>();
  for (const entry of data) {
    if (!entry.price) continue;
    const prev = latest.get(entry.currency);
    if (!prev || new Date(entry.date) > new Date(prev.date)) {
      latest.set(entry.currency, entry);
    }
  }

  return Array.from(latest.values())
    .map((e) => ({
      symbol: e.currency,
      price: e.price,
      iconUrl: `${ICON_BASE}/${e.currency}.svg`,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function formatNumber(n: number, max = 6): string {
  if (!Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  if (Math.abs(n) < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}

/** Format for editable input fields — no thousand separators so it round-trips through parse. */
export function formatAmount(n: number, max = 8): string {
  if (!Number.isFinite(n) || n === 0) return '';
  if (Math.abs(n) < 0.0001) return n.toExponential(2);
  const fixed = n.toFixed(max);
  return fixed.replace(/\.?0+$/, '');
}
