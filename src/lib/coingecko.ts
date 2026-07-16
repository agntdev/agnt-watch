const BASE = "https://api.coingecko.com/api/v3";

export interface CoinPrice {
  ticker: string;
  price_usd: number;
}

let coinListCache: Map<string, { id: string; symbol: string; name: string }> | null = null;
let coinListCacheTime = 0;
const COIN_LIST_TTL = 60 * 60 * 1000;

export async function fetchCoinList(): Promise<Map<string, { id: string; symbol: string; name: string }>> {
  const now = Date.now();
  if (coinListCache && now - coinListCacheTime < COIN_LIST_TTL) return coinListCache;
  try {
    const res = await fetch(`${BASE}/coins/list`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Array<{ id: string; symbol: string; name: string }>;
    coinListCache = new Map(data.map((c) => [c.symbol.toUpperCase(), c]));
    coinListCacheTime = now;
    return coinListCache;
  } catch {
    return coinListCache ?? new Map();
  }
}

export async function validateTicker(ticker: string): Promise<{ valid: boolean; name?: string; id?: string }> {
  const list = await fetchCoinList();
  const upper = ticker.toUpperCase();
  const entry = list.get(upper);
  if (entry) return { valid: true, name: entry.name, id: entry.id };
  return { valid: false };
}

export async function fetchPrices(tickers: string[]): Promise<CoinPrice[]> {
  if (tickers.length === 0) return [];
  const list = await fetchCoinList();
  const ids = tickers
    .map((t) => list.get(t.toUpperCase())?.id)
    .filter((id): id is string => !!id);
  if (ids.length === 0) return [];
  try {
    const res = await fetch(
      `${BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const result: CoinPrice[] = [];
    for (const [id, price] of Object.entries(data)) {
      if (price.usd !== undefined) {
        const entry = [...list.values()].find((c) => c.id === id);
        if (entry) result.push({ ticker: entry.symbol.toUpperCase(), price_usd: price.usd });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}
