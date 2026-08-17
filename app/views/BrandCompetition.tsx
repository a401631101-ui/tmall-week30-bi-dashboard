"use client";

// 03 品牌竞争 —— 品牌强度榜 + 品牌 32 周趋势 + 品牌×品类热力矩阵
import { useMemo, useState } from "react";
import { loadCategories, loadIndex, loadReport, loadTimeseriesBrands, loadTimeseriesBrandCategory } from "../data/loaders";
import { useAsync } from "../hooks";
import { useGlobalFilter } from "../state/GlobalFilterContext";
import { fullRange, allWeeks, sparseWeeks } from "../data/select";
import { Panel, LineChart, Legend, Loading } from "../components/ui";

const MINE_BRANDS = ["东方雨虹", "雨虹飞鱼", "雨虹"];
const MINE_COLORS: Record<string, string> = { 东方雨虹: "#be123c", 雨虹飞鱼: "#fb7185", 雨虹: "#f43f5e" };
const RIVAL_COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#0d9488", "#64748b"];

function MiniTrend({values}:{values:number[]}) {
  const data=values.length?values:[0];
  const min=Math.min(...data); const max=Math.max(...data); const span=Math.max(1,max-min);
  const points=data.map((v,i)=>`${data.length===1?50:(i/(data.length-1))*100},${30-((v-min)/span)*24}`).join(" ");
  const last=points.split(" ").at(-1)?.split(",")??["100","30"];
  return <svg viewBox="0 0 100 34" className="h-9 w-full overflow-visible" preserveAspectRatio="none" aria-label="Top100区间趋势"><path d="M0 31H100" stroke="#dbe3ef" strokeWidth="1"/><polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx={last[0]} cy={last[1]} r="2.8" fill="#2563eb"/></svg>;
}

export function BrandCompetition() {
  const { filter, setBrand } = useGlobalFilter();
  const [sortKey, setSortKey] = useState<"seats" | "top30At" | "top10At" | "delta">("seats");
  const [heatMetric, setHeatMetric] = useState<"t100" | "t30" | "t10">("t100");
  const { data: index } = useAsync(loadIndex);
  const { data: categories } = useAsync(loadCategories);
  const { data: brands } = useAsync(loadTimeseriesBrands);
  const { data: bc } = useAsync(loadTimeseriesBrandCategory);
  const { data: report } = useAsync(() => loadReport(filter.week), [filter.week]);
  const { data: startReport } = useAsync(() => loadReport(filter.startWeek), [filter.startWeek]);

  const sparse = useMemo(() => (index ? sparseWeeks(index) : new Set<number>()), [index]);
  const w = filter.week;

  const ranked = useMemo(() => {
    if (!brands) return [];
    const selectedCategory = filter.category === "全部" ? null : report?.categories[filter.category];
    const source = selectedCategory
      ? selectedCategory.brandTable.map((b) => ({ brand: b.brand, isMine: MINE_BRANDS.includes(b.brand), weeks: [Math.max(1, w - 2), Math.max(1, w - 1), w], top100: b.t100, top30: b.t30, top10: b.t10, categoryCount: [1, 1, 1] }))
      : brands;
    return [...source]
      .map((b) => {
        const i = b.weeks.indexOf(w);
        const cur = i >= 0 ? b.top100[i] ?? 0 : 0;
        const prev = i > 0 ? b.top100[i - 1] ?? 0 : 0;
        let streak = 0;
        for (let j = i; j > 0 && (b.top100[j] ?? 0) > (b.top100[j - 1] ?? 0); j--) streak++;
        return { ...b, seats: cur, delta: cur - prev, at: i, streak, top30At: i >= 0 ? b.top30[i] ?? 0 : 0, top10At: i >= 0 ? b.top10[i] ?? 0 : 0 };
      })
      .filter((b) => filter.brand === "全部" || b.brand === filter.brand)
      .sort((a, z) => Number(z[sortKey]) - Number(a[sortKey]));
  }, [brands, report, w, filter.category, filter.brand, sortKey]);

  if (!brands || !index) return <Loading />;

  // 趋势：我方（按 mine）+ 竞品（filter.rivals 或 默认 Top3）
  const mineNames = filter.mine === "雨虹品牌群" ? MINE_BRANDS : [filter.mine === "雨虹" ? "雨虹" : filter.mine];
  const rivalNames = filter.rivals.length ? filter.rivals : ranked.filter((b) => !b.isMine).slice(0, 3).map((b) => b.brand);
  const startWeek = filter.startWeek;
  const chartWeeks = allWeeks(32).filter((x) => x >= startWeek && x <= w);
  const categoryTop5 = filter.category === "全部" ? [] : (bc ?? []).filter((x)=>x.category===filter.category).map((x)=>{const at=x.weeks.indexOf(w); return {name:x.brand,value:at>=0?x.seats[at]??0:0};}).filter((x)=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,5).map((x)=>x.name);
  const trendNames = filter.category === "全部" ? [...mineNames, ...rivalNames] : categoryTop5;
  const series = [
    ...trendNames.map((n, trendIndex) => {
      const b = brands.find((x) => x.brand === n);
      const cat = bc?.find((x) => x.brand === n && x.category === filter.category);
      return {
        name: n,
        color: MINE_COLORS[n] ?? RIVAL_COLORS[trendIndex % RIVAL_COLORS.length],
        values: filter.category !== "全部" ? (cat ? fullRange(cat.weeks, cat.seats, 0).slice(startWeek - 1, w) : chartWeeks.map(()=>0)) : (b ? fullRange(b.weeks, b.top100, 0).slice(startWeek - 1, w) : chartWeeks.map(() => 0)),
        highlight: n === "东方雨虹",
      };
    }),
  ];

  // 品牌强度榜（Top20）
  const top20 = ranked.slice(0, 20);

  // 热力矩阵：Top12 品牌 × 15 品类，本周 Top100 席位
  const categoryBrands = filter.category === "全部" ? ranked : ranked.filter((b) => heatCellRaw(b.brand, filter.category) > 0);
  const heatBrands = categoryBrands.slice(0, 12).map((b) => b.brand);

  const catKeys = categories ? categories.map((c) => c.key).filter((c)=>filter.category === "全部" || c === filter.category) : [];
  const brandDrill = filter.brand === "全部" ? [] : catKeys.map((cat)=>({cat,value:report?.categories[cat]?.brandTable.find((b)=>b.brand===filter.brand)?.t100.at(-1)??0})).sort((a,b)=>b.value-a.value);
  const brandDrillMax=Math.max(1,...brandDrill.map((x)=>x.value));

  function heatCellRaw(brand: string, cat: string, previous = false): number {
    if (heatMetric === "t100") {
      const trend = bc?.find((x) => x.brand === brand && x.category === cat);
      if (trend) {
        const targetWeek = previous ? startWeek : w;
        let index=-1;
        for(let i=0;i<trend.weeks.length;i++) if(trend.weeks[i]<=targetWeek) index=i;
        if (index >= 0) return trend.seats[index] ?? 0;
      }
    }
    const sourceReport = previous ? startReport : report;
    const hit = sourceReport?.categories[cat]?.brandTable.find((x) => x.brand === brand);
    return hit?.[heatMetric]?.at(-1) ?? 0;
  }

  return (
    <div className="space-y-5">
      <Panel title={`${filter.category === "全部" ? "品牌" : filter.category + " Top5品牌"} Top100 席位趋势`} subtitle={`第${filter.startWeek}—${filter.endWeek}周 · 随顶部类目与竞品筛选变化 · 点位显示具体值`}>
        <LineChart weeks={chartWeeks} series={series} sparseWeeks={sparse} height={280} showValues />
        <div className="mt-2"><Legend items={series} /></div>
      </Panel>

      {filter.brand !== "全部" && <Panel title={`${filter.brand} · 各品类席位占比`} subtitle="点击品牌强度榜或热力矩阵进入下钻"><div className="grid gap-2 md:grid-cols-2">{brandDrill.map((x)=><div key={x.cat} className="grid grid-cols-[100px_1fr_32px] items-center gap-2"><span className="text-xs font-semibold">{x.cat}</span><span className="h-4 rounded-full bg-slate-200"><i className="block h-full rounded-full bg-blue-600" style={{width:`${x.value/brandDrillMax*100}%`}}/></span><b className="text-right text-xs">{x.value}</b></div>)}</div></Panel>}

      <Panel title="品牌强度榜（Top20）" subtitle={`第${w}周 · ${filter.category === "全部" ? "全市场" : filter.category} · 点击品牌下钻`} right={<div className="flex flex-wrap gap-1.5">{[["seats","Top100"],["top30At","Top30"],["top10At","Top10"],["delta","环比"]].map(([k,l])=><button key={k} onClick={()=>setSortKey(k as typeof sortKey)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${sortKey===k?"bg-blue-700 text-white":"bg-slate-100 text-slate-600"}`}>{l} ↕</button>)}</div>}>
        <div className="mb-3 flex flex-wrap items-center justify-center gap-5 text-sm font-semibold text-slate-600"><span><i className="mr-2 inline-block h-2.5 w-7 rounded bg-blue-600"/>Top100</span><span><i className="mr-2 inline-block h-2.5 w-7 rounded bg-violet-500"/>Top30</span><span><i className="mr-2 inline-block h-2.5 w-7 rounded bg-cyan-500"/>Top10</span><span>曲线=所选区间 Top100</span><span>百分比=较上周</span><span className="text-rose-600">红=增长</span><span className="text-green-700">绿=下降</span></div>
        <div className="grid gap-4 xl:grid-cols-2">
          {[top20.slice(0,10),top20.slice(10,20)].map((column,columnIndex)=><div key={columnIndex} className="space-y-2.5">{column.map((b, localIndex) => {
            const i=columnIndex*10+localIndex;
            const max = Math.max(1, ...top20.map((x)=>x.seats));
            const d30=b.at>0?(b.top30[b.at]??0)-(b.top30[b.at-1]??0):0;
            const d10=b.at>0?(b.top10[b.at]??0)-(b.top10[b.at-1]??0):0;
            const previous=b.at>0?(b.top100[b.at-1]??0):0;
            const percent=previous>0?b.delta/previous*100:b.seats>0?100:0;
            const history=b.top100.filter((_,j)=>b.weeks[j]>=filter.startWeek&&b.weeks[j]<=filter.endWeek);
            const deltaClass=(d:number)=>d>0?"text-rose-600":d<0?"text-green-700":"text-slate-500";
            return <button key={b.brand} onClick={()=>setBrand(b.brand)} className={`grid w-full grid-cols-[32px_135px_minmax(130px,1fr)_92px_145px] items-center gap-2 rounded-xl border px-3 py-2 text-left transition hover:border-blue-300 hover:shadow-md ${b.isMine?"border-amber-300 bg-amber-50":"border-slate-200 bg-slate-50/60"}`}>
              <span className="text-center text-base font-black text-slate-400">{i<3?["🥇","🥈","🥉"][i]:i+1}</span>
              <span className="truncate text-[15px] font-black text-slate-800">{b.brand}{b.isMine&&<em className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs not-italic text-rose-700">雨虹</em>}<small className="mt-1 block text-xs font-semibold text-slate-500">覆盖 {b.at>=0?b.categoryCount[b.at]??0:0} 类 · 连增 {b.streak||0} 周</small></span>
              <span className="grid gap-1.5"><i className="h-3 rounded-full bg-slate-200"><b className="block h-full rounded-full bg-blue-600" style={{width:`${b.seats/max*100}%`}}/></i><i className="h-3 rounded-full bg-slate-200"><b className="block h-full rounded-full bg-violet-500" style={{width:`${b.top30At/max*100}%`}}/></i><i className="h-3 rounded-full bg-slate-200"><b className="block h-full rounded-full bg-cyan-500" style={{width:`${b.top10At/max*100}%`}}/></i></span>
              <span className="text-center"><MiniTrend values={history}/><b className={`block text-xs tabular-nums ${deltaClass(percent)}`}>{percent>0?"+":""}{percent.toFixed(1)}%</b></span>
              <span className="grid grid-cols-3 gap-2 text-center text-sm font-black tabular-nums"><span>{b.seats}<small className={`block text-xs ${deltaClass(b.delta)}`}>{b.delta>0?"+":""}{b.delta}</small></span><span>{b.top30At}<small className={`block text-xs ${deltaClass(d30)}`}>{d30>0?"+":""}{d30}</small></span><span>{b.top10At}<small className={`block text-xs ${deltaClass(d10)}`}>{d10>0?"+":""}{d10}</small></span></span>
            </button>;
          })}</div>)}
        </div>
      </Panel>

      <Panel title="品牌 × 品类 热力矩阵" subtitle={`第${startWeek}—${w}周 · 当前值 / 区间变化 · 黄色=雨虹系`} right={<div className="flex gap-1">{(["t100","t30","t10"] as const).map((m)=><button key={m} onClick={()=>setHeatMetric(m)} className={`rounded px-2 py-1 text-xs font-bold ${heatMetric===m?"bg-slate-900 text-white":"bg-slate-100 text-slate-600"}`}>{m.toUpperCase()}</button>)}</div>}>
        <div className="overflow-x-auto pb-2">
          <table className={`${catKeys.length === 1 ? "w-full min-w-full" : "w-full min-w-[1320px]"} table-fixed border-separate border-spacing-1 text-xs`}>
            <thead>
              <tr className="text-slate-500">
                <th className="sticky left-0 z-10 h-16 w-36 bg-white px-3 text-center align-middle text-sm font-black">品牌</th>
                {catKeys.map((c) => (
                  <th key={c} className="h-16 px-1 py-1 text-center align-middle text-xs font-black text-slate-800"><span className="inline-block leading-4">{c}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatBrands.map((b) => {
                const isMine = MINE_BRANDS.includes(b);
                return (
                  <tr key={b}>
                    <td onClick={()=>setBrand(b)} className={`sticky left-0 z-10 h-11 cursor-pointer rounded-lg px-2 text-center align-middle text-xs font-black leading-4 ${isMine ? "bg-amber-200 text-slate-950" : "bg-white text-slate-800"}`}>{b}</td>
                    {catKeys.map((c) => {
                      const v = heatCellRaw(b, c);
                      const prev = heatCellRaw(b, c, true);
                      const delta = v - prev;
                      const alpha = Math.min(1, v / 20);
                      const rgb = delta > 0 ? "225,29,72" : delta < 0 ? "22,163,74" : "100,116,139";
                      return (
                        <td key={c} className="p-0.5">
                          <div
                            className="flex h-11 items-center justify-center rounded-md text-sm font-black tabular-nums"
                            title={`${b} · ${c}: ${prev}→${v}（${delta >= 0 ? "+" : ""}${delta}）`}
                            style={{ backgroundColor: isMine ? "#fde68a" : v > 0 ? `rgba(${rgb},${0.12 + alpha * 0.55})` : "#f1f5f9", color: v > 0 ? (delta < 0 ? "#166534" : delta > 0 ? "#9f1239" : "#475569") : "#cbd5e1" }}
                          >
                            {v > 0 ? <span className="flex flex-col items-center leading-4"><b>{v}</b><small className={`text-[11px] font-black ${delta>0?"text-rose-700":delta<0?"text-green-700":"text-slate-500"}`}>{delta>0?`+${delta}`:delta<0?delta:"—"}</small></span> : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
