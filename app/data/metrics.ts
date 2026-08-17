// 指标口径 + 展示辅助（前端只读，不重算指标；指标值由 Python 产出）
import type { AnomalyType, ConclusionPriority } from "./schema";

// ── 指标口径表（§9） ─────────────────────────────────────────────────────────
export interface MetricDef {
  id: string;
  label: string;
  definition: string;
  source: string; // 源字段 / 计算方式
  note: string;
}

/** 口径已确认（v1.1）：①规模=访客数 ②搜索人气→访客量级 ③雨虹三档并集 ④4/8周=滚动均值 */
export const METRIC_DEFINITIONS: MetricDef[] = [
  { id: "scale", label: "品类规模", definition: "品类入榜商品流量规模", source: "sum(访客数)", note: "分周、分平台可选；GMV(预估支付金额)源数据全空不可用" },
  { id: "growth", label: "品类增长率", definition: "周环比", source: "(本周−上周)/上周", note: "稀疏周以相邻有数据周为基；4/8 周窗口用滚动均值" },
  { id: "brandConcentration", label: "品牌集中度", definition: "头部品牌入榜占比", source: "Top3 品牌入榜商品数 / 品类入榜商品数", note: "" },
  { id: "top10Concentration", label: "Top10 头部集中度", definition: "Top10 内头部品牌占比", source: "Top10 中 Top3 品牌商品数 / 10", note: "" },
  { id: "newBrandSpeed", label: "新品牌进入速度", definition: "本周新出现集合大小", source: "与上周去重集合差集", note: "" },
  { id: "newProductSpeed", label: "新产品进入速度", definition: "本周新出现集合大小", source: "与上周去重集合差集", note: "" },
  { id: "yuhongCoverage", label: "雨虹覆盖强度", definition: "雨虹系 Top100 席位", source: "count(rank≤100 & isMine)", note: "" },
  { id: "consecutiveGrowth", label: "连续增长周数", definition: "Top100 席位连续环比>0", source: "时序滑窗", note: "" },
  { id: "conversion", label: "转化率", definition: "买家/访客", source: "支付买家数/访客数（分桶区间）", note: "源数据 15 行访客为空" },
  { id: "visitorLevel", label: "访客量级", definition: "访客数分桶", source: "访客数分桶（如 1万~2.5万）", note: "原「搜索人气」，已改名" },
];

// ── 展示语义色（§10） ───────────────────────────────────────────────────────
export type Tone = "up" | "down" | "risk" | "neutral" | "segment" | "flat";

/** 根据判断文案归类展示语义色：红=增长/上升/机会 · 绿=下降/收缩 · 橙=风险 · 灰=持平/中性 */
export function judgmentTone(judgment: string): Tone {
  const j = judgment || "";
  if (/强势增强|双增强|矩阵扩张|连续扩张|品牌占位扩大|冲榜|机会|上升|新进/.test(j)) return "up";
  if (/重点预警|全面走弱|连续收缩|跌出/.test(j)) return "risk";
  if (/收缩|效率下降|走弱|回落|腰部收缩/.test(j)) return "down";
  if (/稳定|持平|观察/.test(j)) return "flat";
  return "neutral";
}

/** 单品状态文案归类 */
export function statusTone(status: string): Tone {
  const s = status || "";
  if (/爆品|上升|冲入/.test(s)) return "up";
  if (/回落|走弱/.test(s)) return "down";
  if (/波动/.test(s)) return "risk";
  return "neutral";
}

// ── 异动优先级 + 排序（§6.1） ───────────────────────────────────────────────
/** S=雨虹核心产品或进入Top10 · A=单周变化>20名 · B=连续两周变化 · C=普通新进/跌出 */
export function anomalyPriority(
  type: AnomalyType,
  isMine: boolean,
  currentRank: number | null,
): ConclusionPriority {
  if (isMine || (currentRank != null && currentRank <= 10)) return "S";
  if (type === "单周上升超过20名" || type === "单周下降超过20名") return "A";
  if (type === "连续两周上升" || type === "连续两周下降") return "B";
  return "C";
}

export const ANOMALY_TYPE_ORDER: Record<AnomalyType, number> = {
  连续两周上升: 0,
  连续两周下降: 1,
  单周上升超过20名: 2,
  单周下降超过20名: 3,
  新进前100: 4,
  跌出前100: 5,
};

export const PRIORITY_ORDER: Record<ConclusionPriority, number> = { S: 0, A: 1, B: 2, C: 3 };

// ── 展示格式化（只读，不重算） ──────────────────────────────────────────────
/** 访客量级分桶字符串（原「搜索人气」） */
export function formatVisitorLevel(visitors: string | null | undefined): string {
  if (!visitors) return "—";
  return visitors;
}

/** 排名轨迹显示：null 视为「未入榜」 */
export function formatTrack(track: (number | null)[] | undefined | null): string {
  if (!track) return "—";
  return track.map((r) => (r == null ? "未入榜" : String(r))).join(" → ");
}
