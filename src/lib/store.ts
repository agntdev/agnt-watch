import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  const p = join(DATA_DIR, file);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  ensureDir();
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// --- User profiles ---

export interface UserProfile {
  telegram_id: number;
  display_name: string;
  timezone: string;
  quiet_hours_start: number;
  quiet_hours_end: number;
  summary_time: string;
  cooldown_length: number;
  percent_alert_enabled: boolean;
  threshold_alert_enabled: boolean;
}

const DEFAULT_PROFILE: Omit<UserProfile, "telegram_id" | "display_name"> = {
  timezone: "UTC",
  quiet_hours_start: 22,
  quiet_hours_end: 7,
  summary_time: "08:00",
  cooldown_length: 60,
  percent_alert_enabled: true,
  threshold_alert_enabled: true,
};

export function getProfile(userId: number): UserProfile | undefined {
  const profiles = readJson<Record<string, UserProfile>>("profiles.json", {});
  return profiles[String(userId)];
}

export function saveProfile(profile: UserProfile): void {
  const profiles = readJson<Record<string, UserProfile>>("profiles.json", {});
  profiles[String(profile.telegram_id)] = profile;
  writeJson("profiles.json", profiles);
}

export function getOrCreateProfile(userId: number, displayName: string): UserProfile {
  const existing = getProfile(userId);
  if (existing) return existing;
  const profile: UserProfile = {
    telegram_id: userId,
    display_name: displayName,
    ...DEFAULT_PROFILE,
  };
  saveProfile(profile);
  return profile;
}

// --- Watchlist ---

export interface WatchlistEntry {
  user_id: number;
  ticker: string;
  friendly_name: string;
  threshold_alerts: number[];
  percent_alerts: number[];
  enabled: boolean;
  last_alert_ts: number;
  reference_price: number;
}

export function getWatchlist(userId: number): WatchlistEntry[] {
  const all = readJson<WatchlistEntry[]>("watchlist.json", []);
  return all.filter((e) => e.user_id === userId);
}

export function addToWatchlist(entry: WatchlistEntry): void {
  const all = readJson<WatchlistEntry[]>("watchlist.json", []);
  all.push(entry);
  writeJson("watchlist.json", all);
}

export function removeFromWatchlist(userId: number, ticker: string): boolean {
  const all = readJson<WatchlistEntry[]>("watchlist.json", []);
  const idx = all.findIndex((e) => e.user_id === userId && e.ticker === ticker);
  if (idx < 0) return false;
  all.splice(idx, 1);
  writeJson("watchlist.json", all);
  return true;
}

export function getWatchlistEntry(userId: number, ticker: string): WatchlistEntry | undefined {
  const all = readJson<WatchlistEntry[]>("watchlist.json", []);
  return all.find((e) => e.user_id === userId && e.ticker === ticker);
}

export function updateWatchlistEntry(entry: WatchlistEntry): void {
  const all = readJson<WatchlistEntry[]>("watchlist.json", []);
  const idx = all.findIndex((e) => e.user_id === entry.user_id && e.ticker === entry.ticker);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  writeJson("watchlist.json", all);
}

export function hasInWatchlist(userId: number, ticker: string): boolean {
  return getWatchlist(userId).some((e) => e.ticker === ticker);
}

export function getAllWatchlistEntries(): WatchlistEntry[] {
  return readJson<WatchlistEntry[]>("watchlist.json", []);
}

// --- Owner metrics ---

export interface OwnerMetrics {
  total_users: number;
  active_users_30d: number;
  top_tickers: Array<{ ticker: string; count: number }>;
  alert_type_counts: { threshold: number; percent: number };
}

export function getMetrics(): OwnerMetrics {
  return readJson<OwnerMetrics>("metrics.json", {
    total_users: 0,
    active_users_30d: 0,
    top_tickers: [],
    alert_type_counts: { threshold: 0, percent: 0 },
  });
}

export function updateMetrics(): OwnerMetrics {
  const profiles = readJson<Record<string, UserProfile>>("profiles.json", {});
  const watchlist = readJson<WatchlistEntry[]>("watchlist.json", []);

  const totalUsers = Object.keys(profiles).length;
  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const recentProfiles = Object.values(profiles).filter(
    (p) => nowMs - new Date(p.telegram_id).getTime() < thirtyDaysMs,
  );
  const activeUsers = Math.max(recentProfiles.length, totalUsers);

  const tickerCounts = new Map<string, number>();
  let thresholdCount = 0;
  let percentCount = 0;
  for (const entry of watchlist) {
    tickerCounts.set(entry.ticker, (tickerCounts.get(entry.ticker) ?? 0) + 1);
    if (entry.threshold_alerts.length > 0) thresholdCount++;
    if (entry.percent_alerts.length > 0) percentCount++;
  }

  const topTickers = [...tickerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ticker, count]) => ({ ticker, count }));

  const metrics: OwnerMetrics = {
    total_users: totalUsers,
    active_users_30d: activeUsers,
    top_tickers: topTickers,
    alert_type_counts: { threshold: thresholdCount, percent: percentCount },
  };
  writeJson("metrics.json", metrics);
  return metrics;
}
