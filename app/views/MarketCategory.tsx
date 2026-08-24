"use client";

import { useMemo, useState } from "react";
import { loadCategories, loadIndex, loadTimeseriesCategories, loadReport } from "../data/loaders";
import { useAsync } from "../hooks";
import { useGlobalFilter } from "../state/GlobalFilterContext";
import { Panel, Badge, Loading, ErrorBox, DonutChart } from "../components/ui";
import type { CategoryTimeseries } from "../data/schema";
import { ProductInsightCard } from "../components/ProductInsightCard";
import { isYuhongBrand } from "../data/schema";

function valAt(c: CategoryTimeseries, arr: number[], week: number): number | null { const i=c.weeks.indexOf(week); return i>=0?arr[i]:null; }
function fmtScale(v:number|null):string { if(v==null)return "—"; if(v>=1e8)return(v/1e8).toFixed(1)+"亿"; if(v>=1e4)return(v/1e4).toFixed(1)+"万"; return String(Math.round(v)); }
const COLORS=["#e11d48","#2563eb","#7c3aed","#0f9f6e","#f59e0b","#94a3b8"];

export function MarketCategory(){
  const {filter,setCategory}=useGlobalFilter();
  const {data:categories}=useAsync(loadCategories); const {data:index}=useAsync(loadIndex); const {data:cats}=useAsync(loadTimeseriesCategories); const {data:report}=useAsync(()=>loadReport(filter.week),[filter.week]); const w=filter.week;
  const [drill,setDrill]=useState<{category:string;metric:"scale"|"growth"|"brand"|"yuhong"}|null>(null);
  const [expandedBrand,setExpandedBrand]=useState<string>("");
  const rows=useMemo(()=>(cats??[]).map(c=>({category:c.category,group:categories?.find(x=>x.key===c.category)?.group??"",scale:valAt(c,c.scale,w),growth:valAt(c,c.growth,w),brandCount:valAt(c,c.brandCount,w),brandConc:valAt(c,c.brandConcentration,w),top10Conc:valAt(c,c.top10Concentration,w),newBrands:valAt(c,c.newBrands,w),newProducts:valAt(c,c.newProducts,w),yuhong:valAt(c,c.yuhongTop100,w)})).sort((a,b)=>(b.scale??0)-(a.scale??0)),[cats,categories,w]);
  if(!cats||!index||!report)return <Loading/>; if(!rows.length)return <ErrorBox msg="品类时序为空"/>;
  const active=filter.category==="全部"?rows[0].category:filter.category; const selected=rows.find(r=>r.category===active)??rows[0]; const detail=report.categories[active]; if(!detail)return <ErrorBox msg="所选品类周报为空"/>;
  const brands=detail.brandTable.map(b=>({brand:b.brand,t100:b.t100.at(-1)??0,t30:b.t30.at(-1)??0,t10:b.t10.at(-1)??0,d100:(b.t100.at(-1)??0)-(b.t100.at(-2)??0),tag:b.tag})).filter(b=>b.t100>0).sort((a,b)=>b.t100-a.t100);
  const pie=(key:"t100"|"t30"|"t10")=>{const top=brands.slice(0,5);const other=Math.max(0,brands.reduce((n,b)=>n+b[key],0)-top.reduce((n,b)=>n+b[key],0));return [...top.map((b,i)=>({name:b.brand,value:b[key],color:COLORS[i]})),{name:"其他",value:other,color:COLORS[5]}].filter(x=>x.value>0)};
  const mineRows=brands.filter(b=>isYuhongBrand(b.brand));
  const mine=mineRows.length ? mineRows.reduce((sum,b)=>({brand:"雨虹品牌群",t100:sum.t100+b.t100,t30:sum.t30+b.t30,t10:sum.t10+b.t10,d100:sum.d100+b.d100,tag:"品牌群合并口径"}),{brand:"雨虹品牌群",t100:0,t30:0,t10:0,d100:0,tag:"品牌群合并口径"}) : null;
  const anomalies=Object.entries(detail.anomalies).flatMap(([type,items])=>items.map(item=>({type,item}))).slice(0,8);
  return <div className="space-y-4">
    <section className="rounded-2xl bg-gradient-to-r from-[#111827] via-[#17345f] to-[#7f1237] px-5 py-3 text-center text-white shadow-lg"><div className="text-[11px] font-black uppercase tracking-[.14em] text-rose-200">Category Intelligence · 第{w}周</div><h2 className="mt-0.5 text-xl font-black">{active} 市场竞争驾驶舱</h2><p className="mx-auto mt-1 max-w-4xl text-xs font-semibold leading-5 text-slate-100">{detail.summary}</p></section>
    <div className="grid gap-3 md:grid-cols-4">{[["市场规模",fmtScale(selected.scale),"text-blue-700"],["周增长",`${((selected.growth??0)*100).toFixed(1)}%`,(selected.growth??0)>=0?"text-rose-700":"text-green-700"],["品牌数量",selected.brandCount??"—","text-violet-700"],["雨虹Top100",selected.yuhong??0,"text-rose-700"]].map(([label,value,color])=><div key={label as string} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm"><div className="text-xs font-black text-slate-600">{label}</div><div className={`mt-1 text-2xl font-black ${color}`}>{value}</div></div>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="🏆 品牌排名 TOP3" subtitle="点击品牌查看 Top10 / Top30 / Top100 轨迹"><div className="space-y-2">{brands.slice(0,3).map((b,i)=><div key={b.brand}><button onClick={()=>setExpandedBrand(expandedBrand===b.brand?"":b.brand)} className="grid w-full grid-cols-[34px_1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"><span className="text-xl">{["🥇","🥈","🥉"][i]}</span><div><b className="text-base text-slate-950">{b.brand}</b><div className="text-xs font-semibold text-slate-600">{b.tag}</div></div><div className="text-right"><strong className="text-xl text-blue-700">{b.t100}</strong><div><Badge tone={b.d100>0?"up":b.d100<0?"down":"flat"}>{b.d100>0?"+":""}{b.d100}</Badge></div></div></button>{expandedBrand===b.brand&&<div className="mx-2 grid grid-cols-3 gap-2 rounded-b-xl bg-blue-50 p-3 text-center text-xs font-bold text-blue-800"><span>Top10<br/>{detail.brandTable.find(x=>x.brand===b.brand)?.t10.slice(-3).join(" → ")}</span><span>Top30<br/>{detail.brandTable.find(x=>x.brand===b.brand)?.t30.slice(-3).join(" → ")}</span><span>Top100<br/>{detail.brandTable.find(x=>x.brand===b.brand)?.t100.slice(-3).join(" → ")}</span></div>}</div>)}</div></Panel>
      <Panel title="📊 细分产品方向趋势" subtitle="本周 Top100 商品数量"><div className="flex flex-wrap justify-center gap-2">{detail.segments.slice(0,12).map(s=><div key={s.direction} className="min-w-28 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-center"><b className="block text-sm text-purple-900">{s.direction}</b><strong className="mt-1 block text-xl text-purple-700">{s.t100.at(-1)??0}</strong></div>)}</div></Panel>
    </div>
    <Panel title="品牌矩阵 · Top100 / Top30 / Top10 占比分布" subtitle="三个层级同屏；图例同时呈现席位数量与占比"><div className="grid gap-5 lg:grid-cols-3"><DonutChart centerLabel="Top100" items={pie("t100")}/><DonutChart centerLabel="Top30" items={pie("t30")}/><DonutChart centerLabel="Top10" items={pie("t10")}/></div><div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"><div className="flex flex-wrap items-center justify-center gap-4 text-sm font-bold text-slate-700"><span className="text-rose-800">雨虹品牌群</span>{mine?<><span>Top100 <b className="text-rose-700">{mine.t100}</b></span><span>Top30 <b>{mine.t30}</b></span><span>Top10 <b>{mine.t10}</b></span><Badge tone={mine.d100>0?"up":mine.d100<0?"down":"flat"}>周变化 {mine.d100>0?"+":""}{mine.d100}</Badge></>:<span className="text-slate-500">当前类目未入榜</span>}</div></div></Panel>
    <Panel title={`${active} · 本周 Top10 商品`} subtitle="官方主图、品牌、排名和趋势集中展示"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{detail.top10.slice(0,10).map(p=><ProductInsightCard key={p.productId} product={p}/>)}</div></Panel>
    <Panel title="重点异动商品" subtitle="机会与风险信号直接落到商品"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{anomalies.map(({type,item})=><ProductInsightCard key={`${type}-${item.productId}`} product={{productId:item.productId,name:item.name,brand:item.brand,category:active,rank:typeof item.currentRank==="number"?item.currentRank:null,track:item.track,status:type,direction:item.action,judgment:item.judgment,visitors:item.visitors,conversion:item.conversion}}/>)}</div></Panel>
    <Panel title="15品类经营机会树状矩阵" subtitle="按业务板块分组 · 规模 / 增长 / 品牌 / 雨虹位置纵向比较 · 点击指标下钻区间趋势">
      <div className="space-y-5">
        {[...new Set(rows.map(r=>r.group))].map(group=><div key={group}>
          <div className="mb-2 flex items-center gap-3"><b className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">{group}</b><span className="h-px flex-1 bg-slate-300"/></div>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2">{rows.filter(r=>r.group===group).map(r=>{
            const metrics = [
              {key:"scale" as const,label:"市场规模",value:fmtScale(r.scale),width:Math.min(100,(r.scale??0)/Math.max(1,...rows.map(x=>x.scale??0))*100),tone:"bg-blue-600",box:"bg-blue-50 text-blue-800"},
              {key:"growth" as const,label:"周增长率",value:`${((r.growth??0)*100).toFixed(1)}%`,width:Math.min(100,Math.abs(r.growth??0)*250),tone:(r.growth??0)>=0?"bg-rose-500":"bg-green-600",box:(r.growth??0)>=0?"bg-rose-50 text-rose-800":"bg-green-50 text-green-800"},
              {key:"brand" as const,label:"品牌数量",value:r.brandCount??0,width:(r.brandCount??0)/Math.max(1,...rows.map(x=>x.brandCount??0))*100,tone:"bg-violet-600",box:"bg-violet-50 text-violet-800"},
              {key:"yuhong" as const,label:"雨虹 Top100",value:r.yuhong??0,width:(r.yuhong??0)/Math.max(1,...rows.map(x=>x.yuhong??0))*100,tone:"bg-rose-700",box:"bg-amber-50 text-rose-800"},
            ];
            return <div key={r.category} className={`min-w-[285px] flex-1 rounded-xl border-2 p-2.5 text-left transition ${r.category===active?"border-rose-500 bg-white shadow-md":"border-slate-200 bg-slate-50"}`}>
              <button onClick={()=>setCategory(r.category)} className="mb-1.5 flex w-full items-center justify-between gap-2 whitespace-nowrap"><b className="text-sm text-slate-950">{r.category}</b><span className="text-[10px] font-bold text-slate-500">查看类目 ›</span></button>
              <div className="space-y-1">{metrics.map(metric=><button key={metric.key} onClick={()=>setDrill({category:r.category,metric:metric.key})} className={`grid w-full grid-cols-[86px_minmax(54px,1fr)_58px] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold transition hover:ring-2 hover:ring-blue-300 ${metric.box}`}>
                <span className="overflow-hidden whitespace-nowrap">{metric.label}</span><span className="h-1.5 min-w-[54px] overflow-hidden rounded-full bg-white/80"><i className={`block h-full rounded-full ${metric.tone}`} style={{width:`${Math.max(metric.width>0?4:0,metric.width)}%`}}/></span><b className="whitespace-nowrap text-right tabular-nums">{metric.value}</b>
              </button>)}</div>
            </div>;
          })}</div>
        </div>)}
      </div>
      {drill&&(()=>{
        const ts=cats.find(c=>c.category===drill.category);if(!ts)return null;
        const arr=drill.metric==="scale"?ts.scale:drill.metric==="growth"?ts.growth:drill.metric==="brand"?ts.brandCount:ts.yuhongTop100;
        const vals=ts.weeks.map((week,i)=>({week,value:arr[i]??0})).filter(x=>x.week>=filter.startWeek&&x.week<=filter.endWeek);
        const absMax=Math.max(1,...vals.map(x=>Math.abs(x.value)));
        const minValue=Math.min(...vals.map(x=>x.value)); const maxValue=Math.max(...vals.map(x=>x.value)); const span=Math.max(1,maxValue-minValue);
        const columnWidth=84; const chartWidth=Math.max(640,vals.length*columnWidth); const linePoints=vals.map((x,i)=>`${i*columnWidth+columnWidth/2},${16+(maxValue-x.value)/span*54}`).join(" ");
        const label=drill.metric==="scale"?"市场规模":drill.metric==="growth"?"周增长率":drill.metric==="brand"?"品牌数量":"雨虹 Top100";
        const display=(value:number)=>drill.metric==="scale"?fmtScale(value):drill.metric==="growth"?`${(value*100).toFixed(1)}%`:Math.round(value);
        return <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="flex items-center justify-between"><b>{drill.category} · {label}（第{filter.startWeek}—{filter.endWeek}周）</b><button onClick={()=>setDrill(null)} className="text-xs font-bold text-slate-500">关闭</button></div><div className="mt-3 overflow-x-auto pb-1"><div className="relative h-40" style={{width:chartWidth}}><svg className="pointer-events-none absolute left-0 top-5 z-20 h-20 overflow-visible" width={chartWidth} viewBox={`0 0 ${chartWidth} 84`} preserveAspectRatio="none"><polyline points={linePoints} fill="none" stroke="#e11d48" strokeWidth="3" vectorEffect="non-scaling-stroke"/>{vals.map((x,i)=><circle key={x.week} cx={i*columnWidth+columnWidth/2} cy={16+(maxValue-x.value)/span*54} r="4" fill="#e11d48"/>)}</svg><div className="absolute inset-x-0 bottom-0 flex items-end">{vals.map((x,i)=>{const prev=i>0?vals[i-1].value:null;const change=prev!=null&&prev!==0?(x.value-prev)/Math.abs(prev):null;return <div key={x.week} className="flex shrink-0 flex-col items-center text-center" style={{width:columnWidth}}><b className="text-xs text-slate-900">{display(x.value)}</b><span className={`text-[10px] font-black ${change==null?"text-slate-400":change>=0?"text-rose-600":"text-green-700"}`}>{change==null?"基期":`${change>=0?"+":""}${(change*100).toFixed(1)}%`}</span><div className={`mt-1 w-7 rounded-t opacity-70 ${drill.metric==="growth"&&x.value<0?"bg-green-600":"bg-blue-600"}`} style={{height:`${Math.max(5,Math.abs(x.value)/absMax*58)}px`}}/><small className="mt-1 text-[11px] font-bold text-slate-600">第{x.week}周</small></div>})}</div></div></div></div>;
      })()}
    </Panel>
  </div>;
}
