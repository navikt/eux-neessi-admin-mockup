import type { CountryCode, SectorCode } from "./reference";

export interface MonthInfo {
  key: string;
  label: string;
  short: string;
  partial: boolean;
  startDay: number;
  endDay: number;
  days: number;
  monthOfYear: number;
}

/** One cell of the statistics cube: month × country × sector. */
export interface StatRow {
  m: number;
  c: CountryCode;
  s: SectorCode;
  /** SEDs sent from Norway */
  sent: number;
  /** SEDs received by Norway */
  recv: number;
  /** BUCs created by Norway */
  bucNew: number;
  /** BUCs created by the other country towards Norway */
  bucIn: number;
  /** Replies Norway sent to incoming requests */
  ans: number;
  /** Median days Norway used to answer */
  nDays: number;
  /** % of Norway's answers within deadline */
  nOnTime: number;
  /** Median days the other country used to answer Norway */
  tDays: number;
  tOnTime: number;
}

export interface EnhetRow {
  m: number;
  e: string;
  ans: number;
  daysWeighted: number;
  onTimeWeighted: number;
}

export interface DailyPoint {
  date: string;
  sent: number;
  recv: number;
  bucs: number;
}

export interface StatsDataset {
  generatedFor: string;
  months: MonthInfo[];
  rows: StatRow[];
  enhetRows: EnhetRow[];
  daily: DailyPoint[];
  sedTypes: { type: string; sent: number; recv: number }[];
  /** [weekday 0=Mon][hour] SEDs sent in an average week */
  rhythm: number[][];
}

export interface Totals {
  sent: number;
  recv: number;
  bucNew: number;
  bucIn: number;
  ans: number;
  nDays: number;
  nOnTime: number;
  tDays: number;
  tOnTime: number;
}

export function emptyTotals(): Totals {
  return { sent: 0, recv: 0, bucNew: 0, bucIn: 0, ans: 0, nDays: 0, nOnTime: 0, tDays: 0, tOnTime: 0 };
}

/** Sums volumes and computes answer-weighted averages of the duration metrics. */
export function sumRows(rows: StatRow[]): Totals {
  const t = emptyTotals();
  let nW = 0;
  let tW = 0;
  for (const r of rows) {
    t.sent += r.sent;
    t.recv += r.recv;
    t.bucNew += r.bucNew;
    t.bucIn += r.bucIn;
    t.ans += r.ans;
    const nWeight = r.ans || 0.01;
    const tWeight = r.sent || 0.01;
    t.nDays += r.nDays * nWeight;
    t.nOnTime += r.nOnTime * nWeight;
    t.tDays += r.tDays * tWeight;
    t.tOnTime += r.tOnTime * tWeight;
    nW += nWeight;
    tW += tWeight;
  }
  t.nDays = nW ? t.nDays / nW : 0;
  t.nOnTime = nW ? t.nOnTime / nW : 0;
  t.tDays = tW ? t.tDays / tW : 0;
  t.tOnTime = tW ? t.tOnTime / tW : 0;
  return t;
}

export function groupBy<K extends string | number>(rows: StatRow[], key: (r: StatRow) => K): Map<K, Totals> {
  const groups = new Map<K, StatRow[]>();
  for (const r of rows) {
    const k = key(r);
    const list = groups.get(k);
    if (list) list.push(r);
    else groups.set(k, [r]);
  }
  const out = new Map<K, Totals>();
  for (const [k, list] of groups) out.set(k, sumRows(list));
  return out;
}
