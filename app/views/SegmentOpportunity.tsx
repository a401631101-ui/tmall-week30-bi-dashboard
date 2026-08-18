"use client";

// 05 细分机会 —— 细分方向机会榜（Python 机会评分）
import { useMemo, useState } from "react";
import { loadFactWeek, loadSegments, loadTimeseriesSegments } from "../data/loaders";
import { useAsync } from "../hooks";
import { useGlobalFilter } from "../state/GlobalFilterContext";
import { Panel, Badge, Loading, ErrorBox, LineChart } from "../components/ui";

function fmtScale(v: number): string {
  if (v >= 1e8) return (v / 1e8).toFixed(1) + "亿";
  if (v >= 1e4) return (v / 1e4).toFixed(1) + "万";
  return String(Math.round(v));
}

export function SegmentOpportunity() {
  const { filter } = useGlobalFilter();
  const { data: segs } = useAsync(loadTimeseriesSegments);
  const { data: dims } = useAsync(loadSegments);
  const { data: facts } = useAsync(() => loadFactWeek(filter.week), [filter.week]);

  const w = filter.week;
  const [sortKey, setSortKey] = useState<"score" | "seats" | "growth4w" | "newProducts">("score");
  const [selectedDirection, setSelectedDirection] = useState<string>("");

  const allRows = useMemo(() => {
    if (!segs) return [];
    return segs
      .map((s) => {
        let i=-1; for(let j=0;j<s.weeks.length;j++) if(s.weeks[j]<=w)i=j;
        return {
          direction: s.direction,
          focus: s.focus,
          seats: i >= 0 ? s.seats[i] : null,
          top10: i >= 0 ? s.top10[i] : null,
          scale: i >= 0 ? s.scale[i] : null,
          growth4w: i >= 0 ? s.growth4w[i] : null,
          newProducts: i >= 0 ? s.newProducts[i] : null,
          yuhongSeats: i >= 0 ? s.yuhongSeats[i] : null,
          brandCount: i >= 0 ? s.brandCount[i] : null,
          concentration: i >= 0 ? s.concentration[i] : null,
          score: i >= 0 ? s.opportunityScore[i] : null,
        };
      })
      .filter((r) => r.seats != null)
      .sort((a, z) => (Number(z[sortKey]) || 0) - (Number(a[sortKey]) || 0));
  }, [segs, w, sortKey]);

  const rows = allRows.filter((r) => filter.category === "全部" || dims?.find((d) => d.direction === r.direction)?.categories.includes(filter.category));

  if (!segs) return <Loading />;
  if (!rows.length) return <ErrorBox msg="细分方向数据为空" />;

  const focusRows = [...rows.filter((r) => r.focus), ...rows.filter((r) => !r.focus)].slice(0, 10);
  const top = rows.slice(0, 20);
  const majorBrands = (direction: string) => {
    const counts = new Map<string, number>();
    for (const r of facts ?? []) if (r.direction === direction && (filter.category === "全部" || r.category === filter.category)) counts.set(r.brand, (counts.get(r.brand) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => b).join("、") || "—";
  };
  const action = (score: number | null, covered: number | null) => (score ?? 0) >= 35 && !covered ? "A级：小规模上新试验" : (score ?? 0) >= 25 ? "B级：监测并优化转化" : "C级：谨慎投入";
  const activeDirection = rows.some((r)=>r.direction===selectedDirection) ? selectedDirection : focusRows[0]?.direction ?? rows[0]?.direction;
  const selectedTs = segs.find((s) => s.direction === activeDirection);

  return (
    <div className="space-y-5">
      <Panel title="📊 重点细分产品方向" subtitle={`第${w}周 · 与顶部类目筛选联动 · 点击标签查看趋势`}>
        <div className="flex flex-wrap gap-3">
          {focusRows.map((r) => (
            <button onClick={()=>setSelectedDirection(r.direction)} key={r.direction} className={`min-w-52 rounded-xl border-2 px-5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 ${activeDirection===r.direction?"border-purple-700 bg-purple-700 text-white":"border-purple-200 bg-purple-50"}`}>
              <div className="flex items-center justify-between">
                <span className="text-base font-black">{r.direction}</span>
                <Badge tone="segment">{r.score?.toFixed(0)} 分</Badge>
              </div>
              <div className="mt-1 text-xs opacity-80">Top100 {r.seats} · 近4周 {((r.growth4w??0)*100).toFixed(0)}%</div>
            </button>
          ))}
        </div>
      </Panel>

      {selectedTs && <Panel title={`${selectedTs.direction} · 细分方向趋势`} subtitle={`第${filter.startWeek}—${filter.endWeek}周；纵轴=Top100商品席位`}><LineChart weeks={selectedTs.weeks.filter(x=>x>=filter.startWeek&&x<=filter.endWeek)} series={[{name:selectedTs.direction,color:"#7c3aed",values:selectedTs.seats.filter((_,i)=>selectedTs.weeks[i]>=filter.startWeek&&selectedTs.weeks[i]<=filter.endWeek),highlight:true}]} height={220} showValues /></Panel>}

      <Panel title="细分方向机会榜（Top20）" subtitle={`${filter.category === "全部" ? "全部类目" : filter.category} · 随顶部类目筛选变化 · 点击排序与下钻趋势`} right={<div className="flex flex-wrap gap-1">{[["score","机会分"],["seats","Top100"],["growth4w","近4周"],["newProducts","新品"]].map(([key,label])=><button key={key} onClick={()=>setSortKey(key as typeof sortKey)} className={`rounded-full px-3 py-1 text-sm font-bold ${sortKey===key?"bg-purple-700 text-white":"bg-purple-50 text-purple-700"}`}>{label} ↕</button>)}</div>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{top.map((r)=><button key={r.direction} onClick={()=>setSelectedDirection(r.direction)} className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${activeDirection===r.direction?"border-purple-600 bg-purple-50":"border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-2"><b className="text-base text-slate-900">{r.direction}</b><span className="rounded-full bg-purple-700 px-2 py-1 text-xs font-black text-white">{r.score?.toFixed(0)}分</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span>Top100 <b>{r.seats}</b></span><span>Top10 <b>{r.top10}</b></span><span>规模 <b>{fmtScale(r.scale??0)}</b></span><span className={(r.growth4w??0)>=0?"text-rose-700":"text-green-700"}>4周 <b>{((r.growth4w??0)*100).toFixed(0)}%</b></span><span>新品 <b>{r.newProducts}</b></span><span>雨虹 <b>{r.yuhongSeats}</b></span></div><div className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-600"><div>主要品牌：{majorBrands(r.direction)}</div><div className="mt-1 font-semibold text-purple-700">{action(r.score,r.yuhongSeats)}</div></div></button>)}</div>
      </Panel>
    </div>
  );
}
