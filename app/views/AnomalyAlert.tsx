"use client";

// 06 异动预警 —— 六类信号 + S/A/B/C 优先级 + 默认排序（§6.1）
import { useMemo, useState } from "react";
import { loadReport } from "../data/loaders";
import { useAsync } from "../hooks";
import { useGlobalFilter } from "../state/GlobalFilterContext";
import { isYuhongBrand } from "../data/schema";
import { anomalyPriority, ANOMALY_TYPE_ORDER, PRIORITY_ORDER } from "../data/metrics";
import { Panel, Badge, PriorityBadge, Track, Loading, ErrorBox } from "../components/ui";
import type { Anomaly, AnomalyType } from "../data/schema";
import { ProductInsightCard } from "../components/ProductInsightCard";

export function AnomalyAlert() {
  const { filter } = useGlobalFilter();
  const { data: report } = useAsync(() => loadReport(filter.week), [filter.week]);
  const [typeFilter, setTypeFilter] = useState<string>("全部");
  const [view, setView] = useState<"cards" | "table">("cards");

  const w = filter.week;

  const rows = useMemo(() => {
    if (!report) return [];
    let list: Anomaly[] = report.anomalies || [];
    if (filter.category !== "全部") list = list.filter((a) => a.category === filter.category);
    if (filter.brand !== "全部") list = list.filter((a) => a.brand === filter.brand);
    if (typeFilter !== "全部") list = list.filter((a) => a.type === typeFilter);
    return list
      .map((a) => ({ ...a, priority: anomalyPriority(a.type, isYuhongBrand(a.brand), a.currentRank) }))
      .sort((a, z) => {
        // §6.1 默认排序：① 雨虹 → ② 优先级 → ③ 排名变化 → ④ 人气
        const mineDiff = Number(isYuhongBrand(z.brand)) - Number(isYuhongBrand(a.brand));
        if (mineDiff) return mineDiff;
        const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[z.priority];
        if (pDiff) return pDiff;
        const typeDiff = ANOMALY_TYPE_ORDER[a.type as AnomalyType] - ANOMALY_TYPE_ORDER[z.type as AnomalyType];
        if (typeDiff) return typeDiff;
        return Math.abs(z.delta as number) - Math.abs(a.delta as number);
      });
  }, [report, filter.category, filter.brand, typeFilter]);

  if (!report) return <Loading />;
  if (!report.meta) return <ErrorBox msg="周报数据为空" />;

  const types = ["全部", "连续两周上升", "连续两周下降", "单周上升超过20名", "单周下降超过20名", "新进前100", "跌出前100"];

  return (
    <div className="space-y-5">
      <Panel
        title="异动信号（六类）"
        subtitle={`第${w}周 · 共 ${rows.length} 条 · S=雨虹核心/进Top10 · A=单周>20名 · B=连续两周 · C=新进/跌出`}
        right={<div className="flex items-center gap-2">
          <button onClick={() => setView(view === "cards" ? "table" : "cards")} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs">{view === "cards" ? "切换表格" : "切换图片卡"}</button>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs">
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select></div>}
      >
        {view === "cards" ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{rows.slice(0, 40).map((a) => <ProductInsightCard key={`${a.productId}-${a.type}`} product={{ productId: a.productId, name: a.name, brand: a.brand, category: a.category, direction: a.direction, rank: a.currentRank, track: a.track, status: a.type, visitors: a.visitors, conversion: a.conversion, judgment: a.judgment, action: a.action, priority: a.priority }} />)}</div> : <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3">优先级</th>
                <th className="py-2 pr-3">类型</th>
                <th className="py-2 pr-3">类目</th>
                <th className="py-2 pr-3">品牌</th>
                <th className="py-2 pr-3">商品</th>
                <th className="py-2 pr-3">轨迹</th>
                <th className="py-2 pr-3 text-right">当前排名</th>
                <th className="py-2 pr-3">方向</th>
                <th className="py-2 pr-3">访客量级</th>
                <th className="py-2">处置建议</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((a) => (
                <tr key={`${a.productId}-${a.type}`} className={`border-b border-slate-100 hover:bg-slate-50 ${isYuhongBrand(a.brand) ? "bg-rose-50/50" : ""}`}>
                  <td className="py-2 pr-3"><PriorityBadge priority={a.priority} /></td>
                  <td className="py-2 pr-3">
                    <Badge tone={a.type.includes("上升") || a.type === "新进前100" ? "up" : a.type.includes("下降") || a.type === "跌出前100" ? "down" : "risk"}>{a.type}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-slate-500">{a.category}</td>
                  <td className={`py-2 pr-3 font-medium ${isYuhongBrand(a.brand) ? "text-rose-700" : "text-slate-700"}`}>{a.brand}</td>
                  <td className="max-w-[300px] truncate py-2 pr-3 text-slate-600" title={a.name}>{a.name}</td>
                  <td className="py-2 pr-3"><Track track={a.track} /></td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums">{a.currentRank ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-500">{a.direction}</td>
                  <td className="py-2 pr-3 text-slate-500">{a.visitors}</td>
                  <td className="py-2 text-slate-600">{a.action || a.judgment}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 200 && <p className="mt-2 text-center text-xs text-slate-400">仅显示前 200 条（共 {rows.length} 条）</p>}
        </div>}
      </Panel>
    </div>
  );
}
