// 时序 → 图表 / 窗口聚合的纯函数选择器（前端只读，不重算指标）
import type { TimeWindow, WeekIndex } from "./schema";

/** 稀疏周号映射到全量 1..max 的等长数组（缺失周用 fill 填充） */
export function fullRange(weeks: number[], values: number[], fill = 0, max = 32): number[] {
  const map = new Map(weeks.map((w, i) => [w, values[i]]));
  const out: number[] = [];
  for (let w = 1; w <= max; w++) out.push(map.has(w) ? (map.get(w) as number) : fill);
  return out;
}

export function allWeeks(max = 32): number[] {
  return Array.from({ length: max }, (_, i) => i + 1);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** 窗口聚合：单周=末值，最近4/8周=滚动均值，全部周期=全均值 */
export function windowValue(values: (number | null)[], window: TimeWindow): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (!valid.length) return null;
  if (window === "单周") return valid[valid.length - 1];
  if (window === "最近4周") return Math.round(mean(valid.slice(-4)) * 10) / 10;
  if (window === "最近8周") return Math.round(mean(valid.slice(-8)) * 10) / 10;
  return Math.round(mean(valid) * 10) / 10;
}

/** 数据稀疏周集合（覆盖品类数 < 全量，用于图表阴影标记） */
export function sparseWeeks(index: WeekIndex[]): Set<number> {
  const total = Math.max(1, ...index.map((w) => w.categoryTotal));
  const set = new Set<number>();
  for (const w of index) {
    if (w.categoryCount < total) set.add(w.week);
  }
  return set;
}

/** 从 categoryCount 数组取末值（窗口内） */
export function lastValue(values: number[], fallback = 0): number {
  return values.length ? values[values.length - 1] : fallback;
}
