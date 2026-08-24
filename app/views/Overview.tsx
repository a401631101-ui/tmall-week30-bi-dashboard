"use client";

// 01 经营总览 —— 雨虹核心指标 → 32周趋势 → 品类贡献 → 竞品差距 → 产品机会/风险 → 行动建议
import { useMemo, useState } from "react";
import { loadFactWeek, loadIndex, loadReport, loadTimeseriesBrands, loadTimeseriesCategories, loadTimeseriesBrandCategory } from "../data/loaders";
import { useAsync } from "../hooks";
import { useGlobalFilter } from "../state/GlobalFilterContext";
import { fullRange, allWeeks, sparseWeeks } from "../data/select";
import { Panel, Kpi, LineChart, Legend, Badge, Loading, ErrorBox, PriorityBadge, DonutChart } from "../components/ui";
import type { BrandTimeseries, MineTier } from "../data/schema";
import { isYuhongBrand } from "../data/schema";
import { ProductInsightCard } from "../components/ProductInsightCard";
import { navigateCockpit } from "../navigation";

const MINE_BRANDS: Record<MineTier, string[]> = {
  东方雨虹: ["东方雨虹"],
  雨虹飞鱼: ["雨虹飞鱼"],
  雨虹: ["雨虹"],
  雨虹品牌群: ["东方雨虹", "雨虹飞鱼", "雨虹"],
};

const YUHONG_COLORS: Record<string, string> = {
  东方雨虹: "#be123c",
  雨虹: "#f43f5e",
  雨虹飞鱼: "#fb7185",
};

function mineSeats(brands: BrandTimeseries[], mine: MineTier): { top10: number[]; top30: number[]; top100: number[] } {
  const names = MINE_BRANDS[mine];
  const picked = brands.filter((b) => names.includes(b.brand));
  const top10 = fullRange([], [], 0);
  const top30 = fullRange([], [], 0);
  const top100 = fullRange([], [], 0);
  for (const b of picked) {
    const w10 = fullRange(b.weeks, b.top10, 0);
    const w30 = fullRange(b.weeks, b.top30, 0);
    const w100 = fullRange(b.weeks, b.top100, 0);
    for (let i = 0; i < 32; i++) {
      top10[i] += w10[i];
      top30[i] += w30[i];
      top100[i] += w100[i];
    }
  }
  return { top10, top30, top100 };
}

export function Overview() {
  const { filter, setCategory } = useGlobalFilter();
  const { data: index } = useAsync(loadIndex);
  const { data: report } = useAsync(() => loadReport(filter.week), [filter.week]);
  const { data: brands } = useAsync(loadTimeseriesBrands);
  const { data: cats } = useAsync(loadTimeseriesCategories);
  const { data: brandCategory } = useAsync(loadTimeseriesBrandCategory);
  const { data: facts } = useAsync(() => loadFactWeek(filter.week), [filter.week]);
  const [selectedContribution, setSelectedContribution] = useState<string | null>(null);

  const sparse = useMemo(() => (index ? sparseWeeks(index) : new Set<number>()), [index]);

  const seats = useMemo(() => (brands ? mineSeats(brands, filter.mine) : null), [brands, filter.mine]);

  const mineBrandTs = useMemo(() => {
    if (!brands) return [];
    return MINE_BRANDS[filter.mine].map((name) => brands.find((b) => b.brand === name)).filter((b): b is BrandTimeseries => !!b);
  }, [brands, filter.mine]);

  const coverageCats = useMemo(() => {
    if (!cats) return 0;
    return cats.filter((c) => {
      const at = c.weeks.indexOf(filter.week);
      return at >= 0 && (c.yuhongTop100[at] ?? 0) > 0;
    }).length;
  }, [cats, filter.week]);

  if (!report || !brands || !index) return <Loading />;
  if (!report.meta) return <ErrorBox msg="周报数据为空" />;

  const w = filter.week;
  const idx = w - 1;
  const scopedMineFacts = (facts ?? []).filter((r) => r.isMine && r.rank != null && (filter.category === "全部" || r.category === filter.category));
  const scopedCount = (limit:number) => scopedMineFacts.filter((r)=>(r.rank ?? 999)<=limit).length;
  const t10 = filter.category === "全部" ? seats?.top10[idx] ?? 0 : scopedCount(10);
  const t30 = filter.category === "全部" ? seats?.top30[idx] ?? 0 : scopedCount(30);
  const t100 = filter.category === "全部" ? seats?.top100[idx] ?? 0 : scopedCount(100);
  const scopedMineSeatAt = (week:number) => MINE_BRANDS[filter.mine].reduce((sum, name) => { const hit = brandCategory?.find((x)=>x.brand===name && x.category===filter.category); const wi = hit?.weeks.indexOf(week) ?? -1; return sum + (wi >= 0 ? hit?.seats[wi] ?? 0 : 0); }, 0);
  const scopedTierAt = (metric:"t10"|"t30", offset:-1|-2) => MINE_BRANDS[filter.mine].reduce((sum,name)=>{ const hit=report.categories[filter.category]?.brandTable.find((b)=>b.brand===name); return sum+(hit?.[metric].at(offset)??0); },0);
  const previous100 = filter.category === "全部" ? seats?.top100[idx - 1] ?? 0 : scopedMineSeatAt(w - 1);
  const dT10 = idx > 0 ? t10 - (filter.category === "全部" ? seats?.top10[idx - 1] ?? 0 : scopedTierAt("t10",-2)) : 0;
  const dT30 = idx > 0 ? t30 - (filter.category === "全部" ? seats?.top30[idx - 1] ?? 0 : scopedTierAt("t30",-2)) : 0;
  const dT100 = idx > 0 ? t100 - previous100 : 0;

  // 竞品：本周 Top100 席位最高的 3 个非雨虹品牌
  const selectedRivals = filter.rivals.length ? filter.rivals : null;
  const rivals = brands
    .filter((b) => !b.isMine)
    .filter((b) => !selectedRivals || selectedRivals.includes(b.brand))
    .map((b) => {
      const at = b.weeks.indexOf(w);
      const cat = brandCategory?.find((x)=>x.brand===b.brand && x.category===filter.category);
      const catAt = cat?.weeks.indexOf(w) ?? -1;
      return { brand: b.brand, seats: filter.category === "全部" ? (at >= 0 ? b.top100[at] ?? 0 : 0) : (catAt >= 0 ? cat?.seats[catAt] ?? 0 : 0) };
    })
    .filter((b)=>b.seats > 0)
    .sort((a, z) => z.seats - a.seats)
    .slice(0, 3);

  // 品类贡献：雨虹覆盖席位最高的类目
  const catContribution = (cats ?? [])
    .map((c) => {
      const at = c.weeks.indexOf(w);
      const mineFacts = (facts ?? []).filter((r) => r.category === c.category && r.isMine && r.rank != null);
      const count = (limit:number) => mineFacts.filter((r)=>(r.rank ?? 999)<=limit).length;
      return { category: c.category, top10: count(10), top30: count(30), top100: count(100), seats: at >= 0 ? c.yuhongTop100[at] ?? 0 : 0, growth: at >= 0 ? c.growth[at] ?? 0 : 0 };
    })
    .sort((a, z) => z.top100 - a.top100);
  const growthCat = [...catContribution].sort((a, b) => b.growth - a.growth)[0];
  const declineCat = [...catContribution].sort((a, b) => a.growth - b.growth)[0];

  // 趋势序列
  const startWeek = filter.startWeek;
  const chartWeeks = allWeeks(32).filter((week) => week >= startWeek && week <= w);
  const scopedSeriesValues = (names:string[]) => chartWeeks.map((week)=>names.reduce((sum,name)=>{ const hit=brandCategory?.find((x)=>x.brand===name&&x.category===filter.category); const at=hit?.weeks.indexOf(week)??-1; return sum+(at>=0?hit?.seats[at]??0:0); },0));
  const mineSeries = filter.category !== "全部"
    ? [{ name: filter.mine, color: "#9f1239", values: scopedSeriesValues(MINE_BRANDS[filter.mine]), highlight: true }]
    : filter.mine === "雨虹品牌群" ? [{ name: "雨虹品牌群", color: "#9f1239", values: (seats?.top100 ?? []).slice(startWeek - 1, w), highlight: true }] : mineBrandTs.map((b) => ({ name: b.brand, color: YUHONG_COLORS[b.brand] ?? "#be123c", values: fullRange(b.weeks, b.top100, 0).slice(startWeek - 1, w), highlight: true }));
  const series = [
    ...mineSeries,
    ...rivals.slice(0, filter.rivals.length ? 5 : 0).map((r, i) => {
      const rb = brands.find((b) => b.brand === r.brand);
      return {
        name: r.brand,
        color: ["#2563eb", "#7c3aed", "#0891b2"][i],
        values: filter.category !== "全部" ? scopedSeriesValues([r.brand]) : rb ? fullRange(rb.weeks, rb.top100, 0).slice(startWeek - 1, w) : chartWeeks.map(() => 0),
        highlight: false,
      };
    }),
  ];

  const qm = report.meta.quickMetrics;
  const signalCounts = ["连续两周上升", "单周上升超过20名", "新进前100", "连续两周下降", "单周下降超过20名", "跌出前100"].map((type) => ({ type, count: report.anomalies.filter((a) => a.type === type).length, up: type.includes("上升") || type.includes("新进") }));
  const maxSignal = Math.max(1, ...signalCounts.map((s) => s.count));
  const maxRival = Math.max(t100, ...rivals.map((r) => r.seats), 1);
  const pieColors = ["#e11d48", "#2563eb", "#7c3aed", "#0891b2", "#ea580c", "#16a34a", "#db2777", "#4f46e5", "#0f766e", "#ca8a04", "#64748b", "#9333ea", "#0284c7", "#be123c", "#15803d"];
  const contributionItems = (key: "top100" | "top30" | "top10") => catContribution.map((c, i) => ({ name: c.category, value: c[key], color: pieColors[i % pieColors.length] }));
  const focusAnomalies = report.anomalies.filter((a) => (filter.mine === "雨虹品牌群" ? isYuhongBrand(a.brand) : MINE_BRANDS[filter.mine].includes(a.brand)) && (filter.category === "全部" || a.category === filter.category)).sort((a, b) => Math.abs(Number(b.delta) || 0) - Math.abs(Number(a.delta) || 0)).slice(0, 8);

  return (
    <div className="space-y-5">
      {/* 雨虹核心指标 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="覆盖品类" value={coverageCats} tone="neutral" sub={`共 ${qm.categoryCount} 品类本周有数据`} />
        <Kpi label="Top10 席位" value={t10} delta={dT10} tone={dT10 >= 0 ? "up" : "down"} sub="较上周" />
        <Kpi label="Top30 席位" value={t30} delta={dT30} tone={dT30 >= 0 ? "up" : "down"} sub="较上周" />
        <Kpi label="Top100 席位" value={t100} delta={dT100} tone={dT100 >= 0 ? "up" : "down"} sub={`第${w}周 · ${qm.weekLabel}`} />
      </div>

      {/* 32 周趋势 */}
      <Panel title={`${filter.mine} · Top100 席位趋势`} subtitle={`第${filter.startWeek}—${filter.endWeek}周 · 横轴=周次 · 纵轴=Top100席位整数 · 点位标注具体值`}>
        <LineChart weeks={chartWeeks} series={series} sparseWeeks={sparse} height={220} showValues />
        <div className="mt-2"><Legend items={series} /></div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        {(["top100", "top30", "top10"] as const).map((key) => <Panel key={key} title={`品类贡献（雨虹系 ${key.toUpperCase()} 席位）`} subtitle={selectedContribution ? `已选择 ${selectedContribution}；图例显示席位数与占比` : "点击类目查看席位数量与占比"}><DonutChart centerLabel={selectedContribution ?? key.toUpperCase()} items={contributionItems(key)} onSelect={(cat) => { setSelectedContribution(cat); setCategory(cat); }} /></Panel>)}
      </div>

      <Panel title="竞品差距（本周 Top100 席位）" subtitle="雨虹品牌群与所选竞品对比">
          <ul className="space-y-3">
            {[...rivals.map((r) => ({...r, mine:false})), { brand: filter.mine, seats: t100, mine:true }].map((r) => (
              <li key={r.brand} className="grid grid-cols-[100px_1fr_50px] items-center gap-3 text-sm"><span className={`font-semibold ${r.mine ? "text-rose-700" : "text-slate-700"}`}>{r.brand}</span><span className="h-4 overflow-hidden rounded-full bg-slate-200"><i className={`block h-full rounded-full ${r.mine ? "bg-gradient-to-r from-rose-500 to-rose-700" : "bg-gradient-to-r from-slate-500 to-slate-700"}`} style={{width:`${r.seats/maxRival*100}%`}} /></span><b className="text-right tabular-nums">{r.seats}</b></li>
            ))}
          </ul>
      </Panel>

      <Panel title="可解释决策结论" subtitle="每张卡先给出经营判断，再解释指标口径、证据、影响对象与规则">
        <div className="grid gap-4 lg:grid-cols-3">{(report.conclusions ?? []).map((c, i) => { const parts=c.text.split("；").filter(Boolean); const title=parts[0] || `经营判断 ${i+1}`; const metric=i===0?"雨虹品牌群Top100席位":i===1?"雨虹产品下行信号数":"出现扩张信号的细分方向数"; return <article key={i} className="overflow-hidden rounded-xl border border-slate-300 bg-white"><header className="bg-slate-900 px-4 py-3 text-white"><div className="flex items-center justify-between"><b>结论 {String(i + 1).padStart(2,"0")}</b><PriorityBadge priority={c.priority} /></div><h3 className="mt-2 text-base font-black leading-6">{title}</h3></header><div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800">当前值代表：{metric}</div><div className="grid grid-cols-3 border-b border-slate-200 text-center"><div className="p-3"><small className="text-slate-500">本周</small><b className="block text-2xl">{c.current}</b></div><div className="border-x border-slate-200 p-3"><small className="text-slate-500">上周</small><b className="block text-2xl">{c.previous}</b></div><div className="p-3"><small className="text-slate-500">变化</small><b className={`block text-2xl ${c.delta >= 0 ? "text-rose-600" : "text-green-600"}`}>{c.delta >= 0 ? "+" : ""}{c.delta}</b></div></div><div className="p-4"><div className="flex flex-wrap gap-1.5">{c.affected.map((x) => <span key={x} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">{x}</span>)}</div><div className="mt-3 grid gap-2">{parts.slice(1,6).map((x,j)=><div key={j} className="rounded-lg bg-slate-50 p-2 text-xs font-medium leading-5 text-slate-700">{x}</div>)}</div><div className="mt-3 text-[11px] font-semibold text-slate-500">规则 {c.ruleVersion}</div></div></article>; })}</div>
      </Panel>

      <Panel title="本周行动优先级" right={<Badge tone="risk">决策看板</Badge>}>
        <div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-rose-700 p-4 text-white"><div className="text-xs font-bold text-rose-100">01 · 扩张投入</div><div className="mt-2 text-xl font-black">{growthCat?.category ?? "机会品类"}</div><div className="mt-1 text-sm text-rose-100">增长 {(growthCat?.growth ?? 0) >= 0 ? "+" : ""}{((growthCat?.growth ?? 0)*100).toFixed(0)}%</div></div><div className="rounded-xl bg-blue-700 p-4 text-white"><div className="text-xs font-bold text-blue-100">02 · 爆品冲榜</div><div className="mt-2 text-xl font-black">Top30 {t30}席</div><div className="mt-1 text-sm text-blue-100">本周变化 {dT30 >= 0 ? "+" : ""}{dT30}</div></div><div className="rounded-xl bg-orange-600 p-4 text-white"><div className="text-xs font-bold text-orange-100">03 · 风险止跌</div><div className="mt-2 text-xl font-black">{declineCat?.category ?? "风险品类"}</div><div className="mt-1 text-sm text-orange-100">变化 {((declineCat?.growth ?? 0)*100).toFixed(0)}%</div></div></div>
      </Panel>

      <Panel title="本周雨虹重点变化产品" subtitle="优先展示雨虹品牌群排名变化幅度最大的商品">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{focusAnomalies.map((a) => <ProductInsightCard key={`${a.productId}-${a.type}`} product={{productId:a.productId,name:a.name,brand:a.brand,category:a.category,direction:a.direction,rank:a.currentRank,track:a.track,status:a.type,visitors:a.visitors,conversion:a.conversion,judgment:a.judgment,action:a.action}} />)}{focusAnomalies.length===0&&<div className="col-span-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center font-bold text-slate-500">当前筛选口径暂无雨虹重点变化商品</div>}</div>
      </Panel>

      <button onClick={() => navigateCockpit("06")} className="block w-full text-left"><Panel title="产品机会与风险信号" subtitle="点击整块下钻到异动预警"><div className="grid gap-4 md:grid-cols-2">{signalCounts.map((s) => <div key={s.type} className="grid grid-cols-[120px_1fr_45px] items-center gap-3"><span className="text-xs font-semibold text-slate-700">{s.type}</span><span className="h-5 overflow-hidden rounded-md bg-slate-200"><i className={`block h-full rounded-md ${s.up ? "bg-rose-600" : "bg-green-600"}`} style={{width:`${s.count/maxSignal*100}%`}} /></span><b className={s.up ? "text-right text-rose-700" : "text-right text-green-700"}>{s.count}</b></div>)}</div></Panel></button>
    </div>
  );
}
