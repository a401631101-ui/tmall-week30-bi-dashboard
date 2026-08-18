"use client";

// 全局筛选状态（L3）——周次 / 时间窗口 / 类目 / 品牌 / 我方档位 / 对比品牌
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { GlobalFilter, MineTier, TimeWindow } from "../data/schema";

// 数据值「雨虹」→ 展示名「雨虹（裸）」（口径 v1.1）
export const MINE_TIER_LABELS: Record<MineTier, string> = {
  东方雨虹: "东方雨虹",
  雨虹飞鱼: "雨虹飞鱼",
  雨虹: "雨虹（裸）",
  雨虹品牌群: "雨虹品牌群",
};

export const TIME_WINDOWS: TimeWindow[] = ["单周", "最近4周", "最近8周", "全部周期"];
export const MINE_TIERS: MineTier[] = ["雨虹品牌群", "东方雨虹", "雨虹飞鱼", "雨虹"];

export const DEFAULT_FILTER: GlobalFilter = {
  week: 32,
  startWeek: 25,
  endWeek: 32,
  window: "最近8周",
  category: "全部",
  brand: "全部",
  mine: "雨虹品牌群",
  rivals: [],
};

interface GlobalFilterContextValue {
  filter: GlobalFilter;
  /** 局部合并更新；category 变更时若 brand 不属新类目则自动回落「全部品牌」由调用方处理 */
  setFilter: (patch: Partial<GlobalFilter>) => void;
  setWeek: (week: number) => void;
  setStartWeek: (week: number) => void;
  setEndWeek: (week: number) => void;
  setWindow: (window: TimeWindow) => void;
  setCategory: (category: string) => void;
  setBrand: (brand: string) => void;
  setMine: (mine: MineTier) => void;
  toggleRival: (brand: string) => void;
  reset: () => void;
}

const GlobalFilterContext = createContext<GlobalFilterContextValue | null>(null);

export function GlobalFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilterState] = useState<GlobalFilter>(DEFAULT_FILTER);

  const setFilter = useCallback((patch: Partial<GlobalFilter>) => {
    setFilterState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setWeek = useCallback((week: number) => setFilterState((p)=>({ ...p, week, endWeek: week, startWeek: Math.min(p.startWeek, week) })), []);
  const setStartWeek = useCallback((week: number) => setFilterState((p)=>({ ...p, startWeek: Math.min(week, p.endWeek) })), []);
  const setEndWeek = useCallback((week: number) => setFilterState((p)=>({ ...p, week, endWeek: week, startWeek: Math.min(p.startWeek, week) })), []);
  const setWindow = useCallback((window: TimeWindow) => setFilterState((p)=>{const size=window==="单周"?1:window==="最近4周"?4:window==="最近8周"?8:32;return {...p,window,startWeek:Math.max(1,p.endWeek-size+1)};}), []);
  const setCategory = useCallback((category: string) => setFilter({ category }), [setFilter]);
  const setBrand = useCallback((brand: string) => setFilter({ brand }), [setFilter]);
  const setMine = useCallback((mine: MineTier) => setFilter({ mine }), [setFilter]);

  const toggleRival = useCallback((brand: string) => {
    setFilterState((prev) => {
      if (prev.rivals.includes(brand)) {
        return { ...prev, rivals: prev.rivals.filter((b) => b !== brand) };
      }
      if (prev.rivals.length >= 5) return prev; // 最多 5 个对比品牌
      return { ...prev, rivals: [...prev.rivals, brand] };
    });
  }, []);

  const reset = useCallback(() => setFilterState(DEFAULT_FILTER), []);

  const value = useMemo(
    () => ({ filter, setFilter, setWeek, setStartWeek, setEndWeek, setWindow, setCategory, setBrand, setMine, toggleRival, reset }),
    [filter, setFilter, setWeek, setStartWeek, setEndWeek, setWindow, setCategory, setBrand, setMine, toggleRival, reset],
  );

  return <GlobalFilterContext.Provider value={value}>{children}</GlobalFilterContext.Provider>;
}

export function useGlobalFilter(): GlobalFilterContextValue {
  const ctx = useContext(GlobalFilterContext);
  if (!ctx) throw new Error("useGlobalFilter 必须在 GlobalFilterProvider 内使用");
  return ctx;
}

/** 顶部常驻口径条，如：第32周｜防水涂料｜东方雨虹 vs 三棵树｜最近8周 */
export function filterBreadcrumb(filter: GlobalFilter): string {
  const parts: string[] = [`第${filter.startWeek}—${filter.endWeek}周`];
  if (filter.category !== "全部") parts.push(filter.category);
  const mineLabel = MINE_TIER_LABELS[filter.mine];
  const rivals = filter.rivals;
  if (rivals.length > 0) parts.push(`${mineLabel} vs ${rivals.join(" / ")}`);
  else parts.push(mineLabel);
  if (filter.brand !== "全部") parts.push(`品牌：${filter.brand}`);
  return parts.join("｜");
}
