"use client";

// 驾驶舱外壳 —— 全局筛选 + 布局 + 八页路由
import { useEffect, useMemo, useState } from "react";
import { GlobalFilterProvider, useGlobalFilter, filterBreadcrumb, MINE_TIER_LABELS, MINE_TIERS } from "./state/GlobalFilterContext";
import { loadBrands, loadCategories, loadIndex, loadReport } from "./data/loaders";
import { useAsync } from "./hooks";
import type { MineTier } from "./data/schema";
import { Overview } from "./views/Overview";
import { MarketCategory } from "./views/MarketCategory";
import { BrandCompetition } from "./views/BrandCompetition";
import { ProductCompetition } from "./views/ProductCompetition";
import { SegmentOpportunity } from "./views/SegmentOpportunity";
import { AnomalyAlert } from "./views/AnomalyAlert";
import { YuhongSpecial } from "./views/YuhongSpecial";

const PAGES = [
  { key: "01", name: "经营总览", view: Overview },
  { key: "02", name: "市场与品类", view: MarketCategory },
  { key: "03", name: "品牌竞争", view: BrandCompetition },
  { key: "04", name: "产品竞争", view: ProductCompetition },
  { key: "05", name: "细分机会", view: SegmentOpportunity },
  { key: "06", name: "异动预警", view: AnomalyAlert },
  { key: "07", name: "雨虹专项", view: YuhongSpecial },
] as const;

function Shell() {
  const [page, setPage] = useState<string>("01");
  const { filter } = useGlobalFilter();

  useEffect(() => {
    const onNavigate = (event: Event) => setPage((event as CustomEvent<string>).detail);
    window.addEventListener("cockpit:navigate", onNavigate);
    return () => window.removeEventListener("cockpit:navigate", onNavigate);
  }, []);

  const Active = PAGES.find((p) => p.key === page)?.view ?? Overview;
  const pageName = PAGES.find((p) => p.key === page)?.name ?? "经营总览";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6f8] text-slate-900">
      {/* 左导航 */}
      <aside className="flex w-56 shrink-0 flex-col bg-gradient-to-b from-[#17202d] to-[#111827] text-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 font-black text-white shadow-lg shadow-rose-950/30">虹</div>
          <div className="leading-tight">
            <div className="text-base font-bold">东方雨虹</div>
            <div className="mt-1 text-xs tracking-wide text-slate-300">市场经营决策驾驶舱</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {PAGES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPage(p.key)}
              className={`mb-1.5 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] transition ${
                page === p.key ? "bg-rose-600 font-semibold text-white shadow-md shadow-rose-950/20" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={`text-sm font-mono ${page === p.key ? "text-rose-100" : "text-slate-400"}`}>{p.key}</span>
              {p.name}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs leading-relaxed text-slate-300">
          <div>Python 唯一计算源</div>
          <div>32 周事实数据 · 五层级诊断</div>
        </div>
      </aside>

      {/* 右舞台 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-7 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.16em] text-rose-600">Tmall Market Intelligence · Week {filter.week}</div>
            <h1 className="mt-1 text-xl font-black">{pageName}</h1>
          </div>
          <div className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{filterBreadcrumb(filter)}</div>
        </header>
        <FilterBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-7">
          <div className="mx-auto w-full max-w-[1680px]"><Active /></div>
        </main>
      </div>
    </div>
  );
}

function FilterBar() {
  const { filter, setStartWeek, setEndWeek, setCategory, setBrand, setMine, toggleRival, reset } = useGlobalFilter();
  const { data: index } = useAsync(loadIndex);
  const { data: categories } = useAsync(loadCategories);
  const { data: brands } = useAsync(loadBrands);
  const { data: report } = useAsync(() => loadReport(filter.week), [filter.week]);

  // 本周实际入榜品牌（按 Top100 强度降序），用于品牌/竞品选择
  const rankedBrandRows = useMemo(() => {
    if (!report) return [];
    const source = filter.category === "全部"
      ? report.brandStrength
      : (report.categories[filter.category]?.brandTable ?? []);
    const arr = source.map((b) => ({ brand: b.brand, seats: b.t100.at(-1) ?? 0 }));
    const seen = new Set<string>();
    const out: { brand: string; seats: number }[] = [];
    for (const b of arr.sort((a, z) => z.seats - a.seats)) {
      if (!b.brand || seen.has(b.brand)) continue;
      seen.add(b.brand);
      out.push(b);
    }
    return out.slice(0, 200);
  }, [report, filter.category]);
  const rankedBrands = useMemo(() => rankedBrandRows.map((b) => b.brand), [rankedBrandRows]);

  useEffect(() => {
    if (filter.brand !== "全部" && rankedBrands.length > 0 && !rankedBrands.includes(filter.brand)) {
      setBrand("全部");
    }
  }, [filter.brand, rankedBrands, setBrand]);

  const weeks = index ? index.map((w) => w.week).sort((a, z) => a - z) : [];
  const catOptions = categories ? ["全部", ...categories.map((c) => c.key)] : ["全部"];
  const mineOptions = MINE_TIERS;
  const yuhongBrands = brands ? brands.filter((b) => b.isMine).map((b) => b.canonical) : [];

  const selectCls =
    "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-rose-400 focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-white px-7 py-3 shadow-sm">
      <span className="mr-1 text-sm font-bold text-slate-500">全局口径</span>
      <span className="text-xs font-bold text-slate-500">起始</span>
      <select className={selectCls} value={filter.startWeek} onChange={(e) => setStartWeek(Number(e.target.value))}>{weeks.filter(w=>w<=filter.endWeek).map((w)=><option key={w} value={w}>第{w}周</option>)}</select>
      <span className="text-xs font-bold text-slate-500">结束</span>
      <select className={selectCls} value={filter.endWeek} onChange={(e) => setEndWeek(Number(e.target.value))}>{weeks.map((w)=><option key={w} value={w}>第{w}周</option>)}</select>
      <select className={selectCls} value={filter.category} onChange={(e) => setCategory(e.target.value)}>
        {catOptions.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select className={selectCls} value={filter.mine} onChange={(e) => setMine(e.target.value as MineTier)}>
        {mineOptions.map((m) => (
          <option key={m} value={m}>{MINE_TIER_LABELS[m]}</option>
        ))}
      </select>
      <select className={selectCls} value={filter.brand} onChange={(e) => setBrand(e.target.value)}>
        <option value="全部">全部品牌</option>
        {rankedBrands.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>

      {/* 对比品牌（多选 chips） */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-sm font-semibold text-slate-500">对比</span>
        {filter.rivals.map((b) => (
          <button
            key={b}
            onClick={() => toggleRival(b)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${
              filter.rivals.includes(b) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {b}
          </button>
        ))}
        <select
          aria-label="添加对比品牌"
          value=""
          onChange={(e) => { if (e.target.value) toggleRival(e.target.value); }}
          className="h-9 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600"
        >
          <option value="">＋添加竞品</option>
          {rankedBrandRows.filter((b) => !yuhongBrands.includes(b.brand) && !filter.rivals.includes(b.brand)).map((b, index) => <option key={b.brand} value={b.brand}>#{index + 1} {b.brand}（{b.seats}席）</option>)}
        </select>
      </div>

      <button onClick={reset} className="ml-auto text-sm font-semibold text-slate-500 hover:text-slate-800">重置</button>
    </div>
  );
}

export function CockpitApp() {
  return (
    <GlobalFilterProvider>
      <Shell />
    </GlobalFilterProvider>
  );
}
