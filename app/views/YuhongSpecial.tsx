"use client";

// 07 雨虹专项 —— 三子品牌 32 周趋势 + 品类席位变化 + 与 Top3 竞品差距 + 未覆盖高增长细分
import { useMemo, useState } from "react";
import { loadIndex, loadReport, loadSegments, loadTimeseriesBrands, loadTimeseriesCategories, loadTimeseriesProducts, loadTimeseriesSegments } from "../data/loaders";
import { useAsync } from "../hooks";
import { useGlobalFilter } from "../state/GlobalFilterContext";
import { fullRange, allWeeks, sparseWeeks } from "../data/select";
import { Panel, Kpi, LineChart, Legend, Badge, Loading } from "../components/ui";
import type { BrandTimeseries } from "../data/schema";
import { isYuhongBrand } from "../data/schema";
import { ProductInsightCard } from "../components/ProductInsightCard";
import { navigateCockpit } from "../navigation";

const YUHONG = ["东方雨虹", "雨虹飞鱼", "雨虹"];
const COLORS: Record<string, string> = { 东方雨虹: "#be123c", 雨虹飞鱼: "#fb7185", 雨虹: "#f43f5e", 雨虹品牌群: "#881337" };

function groupSeats(brands: BrandTimeseries[], names: string[], metric: "top100"|"top30"|"top10" = "top100"): number[] {
  const acc = fullRange([], [], 0);
  for (const n of names) {
    const b = brands.find((x) => x.brand === n);
    if (!b) continue;
    const v = fullRange(b.weeks, b[metric], 0);
    for (let i = 0; i < 32; i++) acc[i] += v[i];
  }
  return acc;
}

export function YuhongSpecial() {
  const { filter, setCategory } = useGlobalFilter();
  const { data: index } = useAsync(loadIndex);
  const { data: brands } = useAsync(loadTimeseriesBrands);
  const { data: cats } = useAsync(loadTimeseriesCategories);
  const { data: segs } = useAsync(loadTimeseriesSegments);
  const { data: report } = useAsync(() => loadReport(filter.week), [filter.week]);
  const { data: products } = useAsync(loadTimeseriesProducts);
  const { data: segmentDims } = useAsync(loadSegments);
  const [trendMetric, setTrendMetric] = useState<"top100"|"top30"|"top10">("top100");
  const [trendScope, setTrendScope] = useState<"雨虹品牌群"|"全部拆分"|"东方雨虹"|"雨虹飞鱼"|"雨虹">("雨虹品牌群");
  const [lifecycleStage, setLifecycleStage] = useState("上升");

  const sparse = useMemo(() => (index ? sparseWeeks(index) : new Set<number>()), [index]);
  const w = filter.week;
  const wi = w - 1;
  const startWeek = filter.startWeek;
  const chartWeeks = allWeeks(32).filter((x) => x >= startWeek && x <= w);

  const series = useMemo(() => {
    if (!brands) return [];
    const metric=trendMetric;
    const group = groupSeats(brands, YUHONG, metric);
    const groupLine={ name: "雨虹品牌群", color: COLORS["雨虹品牌群"], values: group.slice(startWeek - 1, w), highlight: true };
    const detailLines=YUHONG.map((name)=>{const b=brands.find((x)=>x.brand===name); return {name:name==="雨虹"?"雨虹（裸）":name,color:COLORS[name],values:b?fullRange(b.weeks,b[metric],0).slice(startWeek-1,w):chartWeeks.map(()=>0)};});
    if(trendScope==="全部拆分") return [groupLine,...detailLines];
    if(trendScope==="雨虹品牌群") return [groupLine];
    return detailLines.filter((line)=>line.name===(trendScope==="雨虹"?"雨虹（裸）":trendScope));
  }, [brands, chartWeeks, startWeek, w, trendMetric, trendScope]);

  if (!brands || !index) return <Loading />;

  const group = groupSeats(brands, YUHONG);
  const group30 = groupSeats(brands, YUHONG, "top30");
  const group10 = groupSeats(brands, YUHONG, "top10");
  const t100 = group[wi];
  const d100 = wi > 0 ? t100 - group[wi - 1] : 0;

  // 品类席位变化（本周 vs 上周）
  const catChanges = (cats ?? [])
    .map((c) => {
      const i = c.weeks.indexOf(w);
      const cur = i >= 0 ? c.yuhongTop100[i] : 0;
      const prev = i > 0 ? c.yuhongTop100[i - 1] : 0;
      return { category: c.category, cur, delta: cur - prev };
    })
    .sort((a, z) => z.cur - a.cur);

  // 与 Top3 竞品差距
  const topRivals = (filter.category !== "全部" ? (report?.categories[filter.category]?.brandTable ?? []).filter((b)=>!isYuhongBrand(b.brand)).map((b)=>({brand:b.brand,seats:b.t100.at(-1)??0})) : (brands ?? [])
    .filter((b) => !b.isMine)
    .map((b) => "top100" in b ? ({ brand: b.brand, seats: fullRange(b.weeks, b.top100, 0)[wi] ?? 0 }) : b))
    .sort((a, z) => z.seats - a.seats)
    .slice(0, 5);

  // 未覆盖的高增长细分（机会高但雨虹覆盖低）
  const gaps = (segs ?? [])
    .map((s) => {
      const i = s.weeks.indexOf(w);
      return { direction: s.direction, score: i >= 0 ? s.opportunityScore[i] : 0, yuhong: i >= 0 ? s.yuhongSeats[i] : 0, seats: i >= 0 ? s.seats[i] : 0 };
    })
    .filter((s) => filter.category === "全部" || segmentDims?.find((d)=>d.direction===s.direction)?.categories.includes(filter.category))
    .filter((s) => s.seats >= 1)
    .sort((a, z) => z.score - a.score);
  const categoryTiers = Object.entries(report?.categories ?? {}).map(([category, block]) => {
    const mine = block.brandTable.filter((b) => isYuhongBrand(b.brand));
    const sum = (key: "t10" | "t30" | "t100", previous=false) => mine.reduce((n, b) => n + (b[key].at(previous?-2:-1) ?? 0), 0);
    const catTs=cats?.find((c)=>c.category===category); const catAt=catTs?.weeks.indexOf(w)??-1;
    return { category, t10: sum("t10"), t30: sum("t30"), t100: catAt>=0?catTs?.yuhongTop100[catAt]??sum("t100"):sum("t100"), prev10:sum("t10",true),prev30:sum("t30",true),prev100:catAt>0?catTs?.yuhongTop100[catAt-1]??sum("t100",true):sum("t100",true) };
  }).sort((a, b) => b.t100 - a.t100);
  const selectedMineSeats = filter.category === "全部" ? t100 : categoryTiers.find((c)=>c.category===filter.category)?.t100 ?? 0;
  const selectedMineBrands = filter.mine === "雨虹品牌群" ? YUHONG : [filter.mine];
  const explicitExits=new Set((report?.anomalies??[]).filter(a=>a.type.includes("跌出")&&a.currentRank==null&&a.previousRank!=null).map(a=>String(a.productId)));
  const uniqueProducts=[...new Map((products??[]).map((p)=>[String(p.id),p])).values()];
  const lifecycle = uniqueProducts.filter((p) => selectedMineBrands.includes(p.brand) && (filter.category === "全部" || p.category === filter.category) && p.weeks.some(x=>x===w||x===w-1)).map((p) => {
    const rankAt=(week:number)=>{const i=p.weeks.indexOf(week);return i>=0?p.rank[i]??null:null;};
    const cur=rankAt(w), prev=rankAt(w-1);
    const isExit=explicitExits.has(String(p.id))&&prev!=null&&cur==null;
    const stage = isExit ? "退出" : cur!=null&&prev==null ? "新进" : cur!=null&&prev!=null&&cur<prev ? "上升" : cur!=null&&prev!=null&&cur>prev ? "衰退" : cur!=null ? "稳定" : null;
    return { ...p, cur, stage };
  }).filter((p):p is typeof p & {stage:string}=>p.stage!=null);
  const riseProducts=(report?.anomalies??[]).filter((a)=>selectedMineBrands.includes(a.brand)&&(filter.category==="全部"||a.category===filter.category)&&(a.type.includes("上升")||a.type.includes("新进"))).slice(0,4);
  const riskProducts=(report?.anomalies??[]).filter((a)=>selectedMineBrands.includes(a.brand)&&(filter.category==="全部"||a.category===filter.category)&&(a.type.includes("下降")||a.type.includes("跌出"))).slice(0,4);
  const maxCat=Math.max(1,...catChanges.map((c)=>c.cur));
  const stageProducts=lifecycle.filter((p)=>p.stage===lifecycleStage);
  const lifecycleRules:Record<string,string>={
    "新进":"本周有Top100排名、上周没有排名，判为新进。",
    "上升":"本周和上周均在Top100，且本周排名数字更小，判为上升。",
    "稳定":"本周仍在Top100，且排名与上周相同或缺少可比上周值，判为稳定。",
    "衰退":"本周和上周均在Top100，且本周排名数字更大，判为衰退。",
    "退出":"仅当上周在Top100、本周排名为空，并且周报明确产生“跌出前100”信号时判为退出。此前排名持续上升也不改变本周跌出的事实。",
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {[["Top100",group,d100],["Top30",group30,wi>0?group30[wi]-group30[wi-1]:0],["Top10",group10,wi>0?group10[wi]-group10[wi-1]:0]].map(([label,values,delta])=><button key={label as string} onClick={()=>navigateCockpit("04")}><Kpi label={`雨虹品牌群 ${label} 席位`} value={(values as number[])[wi]} delta={delta as number} tone={(delta as number)>=0?"up":"down"} sub="点击进入产品竞争" /></button>)}
      </div>

      <Panel title="雨虹品牌群趋势" subtitle={`第${filter.startWeek}—${filter.endWeek}周 · 雨虹品牌群及三品牌拆分 · 当前=${trendMetric.toUpperCase()}`} right={<div className="flex gap-1">{(["top100","top30","top10"] as const).map((m)=><button key={m} onClick={()=>setTrendMetric(m)} className={`rounded px-3 py-1 text-xs font-bold ${trendMetric===m?"bg-rose-700 text-white":"bg-rose-50 text-rose-700"}`}>{m.toUpperCase()}</button>)}</div>}>
        <div className="mb-3 flex flex-wrap justify-center gap-2">{(["雨虹品牌群","全部拆分","东方雨虹","雨虹飞鱼","雨虹"] as const).map((name)=><button key={name} onClick={()=>setTrendScope(name)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${trendScope===name?"bg-slate-900 text-white":"bg-slate-100 text-slate-600"}`}>{name==="雨虹"?"雨虹（裸）":name}</button>)}</div>
        <LineChart weeks={chartWeeks} series={series} sparseWeeks={sparse} height={210} showValues />
        <div className="mt-2"><Legend items={series} /></div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="各品类雨虹席位变化" subtitle={`第${w}周 vs 上周 · 点击品类切换筛选`}>
          <ul className="max-h-72 space-y-3 overflow-y-auto pr-2">
            {catChanges.slice(0, 15).map((c) => (
              <li key={c.category} onClick={()=>setCategory(c.category)} className="grid cursor-pointer grid-cols-[90px_1fr_auto] items-center gap-2 text-sm">
                <span className="font-semibold text-slate-600">{c.category}</span><span className="h-4 rounded-full bg-slate-200"><i className="block h-full rounded-full bg-rose-600" style={{width:`${c.cur/maxCat*100}%`}}/></span><span className="flex items-center gap-2"><b>{c.cur}</b>
                  <Badge tone={c.delta > 0 ? "up" : c.delta < 0 ? "down" : "flat"}>{c.delta > 0 ? "+" : ""}{c.delta}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

          <Panel title="与 Top5竞品差距" subtitle={`${filter.category === "全部" ? "全品类" : filter.category} · Top100席位`}>
            <ul className="max-h-72 space-y-3 overflow-y-auto pr-2">
              {topRivals.map((r) => {
                const gap = selectedMineSeats - r.seats;
                return (
                  <li key={r.brand} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{r.brand}</span>
                    <span className="tabular-nums">
                      <span className="font-semibold">{r.seats}</span>
                      <span className={`ml-2 text-xs ${gap >= 0 ? "text-rose-600" : "text-green-600"}`}>{gap >= 0 ? `雨虹领先 ${gap}` : `雨虹落后 ${-gap}`}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="高增长细分方向覆盖" subtitle="与顶部类目筛选联动 · 标签显示是否覆盖">
            {gaps.length === 0 ? (
              <p className="text-sm text-slate-400">暂无显著未覆盖的高增长方向。</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-2">
                {gaps.map((g) => (
                  <div key={g.direction} className={`rounded-lg border-2 px-3 py-2 text-sm font-bold ${g.yuhong>0?"border-rose-200 bg-rose-50 text-rose-800":"border-purple-200 bg-purple-50 text-purple-800"}`}>{g.direction} · {g.yuhong>0?`已覆盖 ${g.yuhong}席`:"未覆盖"} · T100 {g.seats}</div>
                ))}
              </div>
            )}
          </Panel>
      </div>

      <Panel title="雨虹品类层级矩阵" subtitle="柱顶=当前席位；柱下=较上周变化；点击类目下钻产品竞争">
        <div className="flex min-h-80 items-end gap-3 overflow-x-auto px-2 pt-8">{categoryTiers.map((c)=><button onClick={()=>{setCategory(c.category);navigateCockpit("04");}} key={c.category} className="flex min-w-28 flex-1 flex-col items-center rounded-lg p-2 hover:bg-blue-50"><div className="flex h-56 items-end gap-1">{[["T100",c.t100,c.prev100,"bg-blue-600"],["T30",c.t30,c.prev30,"bg-purple-600"],["T10",c.t10,c.prev10,"bg-rose-600"]].map(([label,val,prev,color])=><div key={label as string} className="flex h-full flex-col justify-end text-center"><b className="mb-1 text-xs text-slate-800">{val}</b><div className={`w-7 rounded-t ${color}`} style={{height:`${Number(val)/Math.max(1,...categoryTiers.map(x=>x.t100))*100}%`,minHeight:Number(val)>0?4:0}}/><small className={`${Number(val)-Number(prev)>=0?"text-rose-700":"text-green-700"}`}>{label}<br/>{Number(val)-Number(prev)>=0?"+":""}{Number(val)-Number(prev)}</small></div>)}</div><b className="mt-2 text-xs">{c.category}</b></button>)}</div>
      </Panel>

      <Panel title="雨虹产品生命周期" subtitle="退出=上周在Top100、本周明确出现跌出Top100信号；仍有当前排名的商品不会判为退出">
        <div className="grid grid-cols-5 gap-2">{[["新进","bg-blue-600"],["上升","bg-rose-600"],["稳定","bg-slate-600"],["衰退","bg-green-600"],["退出","bg-orange-600"]].map(([stage,color]) => <button onClick={()=>setLifecycleStage(stage)} key={stage} className={`${color} rounded-xl p-4 text-center text-white shadow ${lifecycleStage===stage?"ring-4 ring-amber-300":""}`}><div className="text-xs font-bold text-white">{stage}</div><div className="mt-1 text-3xl font-black">{lifecycle.filter((p) => p.stage === stage).length}</div></button>)}</div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"><b className="mr-2 text-slate-950">{lifecycleStage}判定：</b>{lifecycleRules[lifecycleStage]} <span className="ml-2 text-slate-500">当前共 {stageProducts.length} 个商品。</span></div>
        <div key={lifecycleStage} className="mt-5 grid gap-5 md:grid-cols-3 xl:grid-cols-4">{stageProducts.map((p)=>{const track=p.weeks.map((week,i)=>({week,rank:p.rank[i]})).filter(x=>x.week<=w).slice(-3).map(x=>x.rank);return <ProductInsightCard key={p.id} compact product={{productId:p.id,name:p.name,brand:p.brand,category:p.category,rank:p.cur,track,status:lifecycleStage,judgment:lifecycleStage==="退出"?`第${w-1}周排名 ${track.at(-1)??"—"}，第${w}周无Top100排名且收到明确跌出信号。`:lifecycleRules[lifecycleStage]}} />})}{stageProducts.length===0&&<div className="col-span-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center text-base font-bold text-slate-500">当前阶段暂无商品</div>}</div>
      </Panel>

      <Panel title="雨虹上升产品" subtitle="商品卡展示"><div className="grid gap-4 md:grid-cols-4">{riseProducts.map((a)=><ProductInsightCard key={`${a.productId}-${a.type}`} compact product={{productId:a.productId,name:a.name,brand:a.brand,category:a.category,direction:a.direction,rank:a.currentRank,track:a.track,status:a.type,visitors:a.visitors,conversion:a.conversion,judgment:a.judgment,action:a.action}} />)}</div></Panel>
      <Panel title="雨虹风险产品" subtitle="商品卡展示"><div className="grid gap-4 md:grid-cols-4">{riskProducts.map((a)=><ProductInsightCard key={`${a.productId}-${a.type}`} compact product={{productId:a.productId,name:a.name,brand:a.brand,category:a.category,direction:a.direction,rank:a.currentRank,track:a.track,status:a.type,visitors:a.visitors,conversion:a.conversion,judgment:a.judgment,action:a.action}} />)}</div></Panel>
    </div>
  );
}
