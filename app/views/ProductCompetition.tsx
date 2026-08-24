"use client";

// 04 产品竞争 —— 各类目 Top10 + 雨虹产品矩阵 + 上升/下降最快 + 六类异动
import { useMemo, useState } from "react";
import { loadReport } from "../data/loaders";
import { useAsync } from "../hooks";
import { useGlobalFilter } from "../state/GlobalFilterContext";
import { isYuhongBrand } from "../data/schema";
import { Panel, Badge, Track, Loading, ErrorBox } from "../components/ui";
import type { ProductTrend } from "../data/schema";
import { ProductInsightCard } from "../components/ProductInsightCard";

export function ProductCompetition() {
  const { filter } = useGlobalFilter();
  const { data: report } = useAsync(() => loadReport(filter.week), [filter.week]);
  const [topSort, setTopSort] = useState<"rank" | "category" | "brand">("rank");

  const w = filter.week;
  const top10 = useMemo(() => {
    if (!report) return [];
    let list: ProductTrend[] = report.top10Products || [];
    if (filter.category !== "全部") list = list.filter((p) => p.category === filter.category);
    if (filter.brand !== "全部") list = list.filter((p) => p.brand === filter.brand);
    return list;
  }, [report, filter.category, filter.brand]);

  if (!report) return <Loading />;
  if (!report.meta) return <ErrorBox msg="周报数据为空" />;

  let anomalies = report.anomalies || [];
  if (filter.category !== "全部") anomalies = anomalies.filter((a) => a.category === filter.category);
  if (filter.brand !== "全部") anomalies = anomalies.filter((a) => a.brand === filter.brand);
  const sortedTop10 = [...top10].sort((a, b) => {
    if (topSort === "category") return a.category.localeCompare(b.category, "zh-CN") || a.rank - b.rank;
    if (topSort === "brand") return a.brand.localeCompare(b.brand, "zh-CN") || a.rank - b.rank;
    return a.rank - b.rank || a.category.localeCompare(b.category, "zh-CN");
  });
  const risers = anomalies.filter((a) => a.type === "单周上升超过20名").slice(0, 8);
  const droppers = anomalies.filter((a) => a.type === "单周下降超过20名").slice(0, 8);

  const typeCounts = (["连续两周上升", "连续两周下降", "单周上升超过20名", "单周下降超过20名", "新进前100", "跌出前100"] as const).map(
    (t) => ({ type: t, count: anomalies.filter((a) => a.type === t).length }),
  );
  const prodRow = (p: ProductTrend) => (
    <tr key={p.productId} className={`border-b border-slate-100 hover:bg-slate-50 ${isYuhongBrand(p.brand) ? "bg-rose-50/50" : ""}`}>
      <td className="py-2 pr-3"><Badge tone="neutral">{p.category}</Badge></td>
      <td className="py-2 pr-3 text-right"><Badge tone={p.rank <= 3 ? "risk" : "up"}>#{p.rank}</Badge></td>
      <td className="py-2 pr-3"><Badge tone={isYuhongBrand(p.brand) ? "up" : "neutral"}>{p.brand}</Badge></td>
      <td className="max-w-[360px] truncate py-2 pr-3 text-slate-600" title={p.name}>{p.name}</td>
      <td className="py-2 pr-3"><Track track={p.track} /></td>
      <td className="py-2 pr-3"><Badge tone="neutral">{p.status}</Badge></td>
      <td className="py-2 pr-3 text-slate-500">{p.direction}</td>
      <td className="py-2 pr-3 text-slate-500">{p.visitors}</td>
      <td className="py-2 text-slate-500">{p.conversion}</td>
    </tr>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-900 to-purple-900 p-5 text-white shadow-lg"><div className="text-xs font-bold uppercase tracking-widest text-blue-200">Product intelligence</div><h2 className="mt-1 text-2xl font-black">产品竞争与爆品信号</h2><div className="mt-3 flex flex-wrap gap-2">{typeCounts.map((t)=><span key={t.type} className={`rounded-full px-3 py-1 text-xs font-bold ${t.type.includes("上升")||t.type.includes("新进")?"bg-rose-500 text-white":"bg-green-600 text-white"}`}>{t.type} <b>{t.count}</b></span>)}</div></section>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {typeCounts.map((t) => (
          <div key={t.type} className={`rounded-xl border-2 px-3 py-3 text-center shadow-sm ${t.type.includes("上升")||t.type.includes("新进")?"border-rose-200 bg-rose-50":"border-green-200 bg-green-50"}`}>
            <div className={`text-2xl font-black tabular-nums ${t.type.includes("上升")||t.type.includes("新进")?"text-rose-700":"text-green-700"}`}>{t.count}</div>
            <div className="text-xs font-bold text-slate-700">{t.type}</div>
          </div>
        ))}
      </div>

      <Panel title="TOP10 产品" subtitle={`${filter.category === "全部" ? "全部类目" : filter.category} · 官方主图、商品ID、排名轨迹与天猫详情`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedTop10.slice(0, 12).map((p) => <ProductInsightCard key={p.productId} product={p} />)}
        </div>
      </Panel>

      <Panel
        title="各类目 Top10 商品"
        subtitle={`第${w}周 · 共 ${top10.length} 条 · 雨虹系高亮`}
        right={<div className="flex gap-1">{([['rank','排名'],['category','类目'],['brand','品牌']] as const).map(([key,label]) => <button key={key} onClick={() => setTopSort(key)} className={`rounded-md px-2.5 py-1 text-xs font-bold ${topSort === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}</div>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">类目</th>
                <th className="py-2 pr-3 text-right">排名</th>
                <th className="py-2 pr-3">品牌</th>
                <th className="py-2 pr-3">商品</th>
                <th className="py-2 pr-3">轨迹</th>
                <th className="py-2 pr-3">状态</th>
                <th className="py-2 pr-3">方向</th>
                <th className="py-2 pr-3">访客量级</th>
                <th className="py-2">转化率</th>
              </tr>
            </thead>
            <tbody>{sortedTop10.map(prodRow)}</tbody>
          </table>
        </div>
      </Panel>

      <Panel title="重点异动商品图谱" subtitle="参考旧看板商品表达：大图、排名状态、指标、判断与行动建议">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...risers.slice(0, 4), ...droppers.slice(0, 4)].map((a) => <ProductInsightCard key={`${a.productId}-${a.type}`} product={{ productId: a.productId, name: a.name, brand: a.brand, category: a.category, direction: a.direction, rank: a.currentRank, track: a.track, status: `${a.type.includes("上升") ? "↑" : "↓"}${Math.abs(Number(a.delta) || 0)}`, visitors: a.visitors, conversion: a.conversion, judgment: a.judgment, action: a.action }} />)}
        </div>
      </Panel>

    </div>
  );
}
