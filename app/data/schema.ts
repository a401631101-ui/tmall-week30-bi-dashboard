// 领域模型 — 类型定义（对应 public/data/*.json 的实际产出）
// Python 是唯一计算源：本文件只做类型描述，不重算指标。

// ── 完整度模型（index.json） ────────────────────────────────────────────────
export type WeekQuality = "complete" | "sparse" | "partial";

export interface RowAnomalies {
  duplicateProductIds: number;
  nullId: number;
  nullRank: number;
  nullVisitors: number;
}

export interface WeekIndex {
  week: number; // 1..32（业务周，与 Excel「第N周」一致）
  period: string; // "2025-12-29 ~ 2026-01-04"
  monday: string; // ISO 周一
  totalRows: number;
  categoryCount: number;
  categoryTotal: number;
  categoryCoverage: number; // 0..1
  presentCategories: string[];
  missingCategories: string[];
  quality: WeekQuality;
  rowAnomalies: RowAnomalies;
  riskNotes: string[];
}

// ── 维度（dimensions/*.json） ────────────────────────────────────────────────
export type CategoryGroup = "涂料与防水" | "胶粘与辅材" | "卫浴五金" | "厨卫水件";
export type YuhongTier = "东方雨虹" | "雨虹飞鱼" | "雨虹";

export interface CategoryDim {
  key: string; // UI 名，如 "美缝/勾缝剂"
  sheetName: string; // Excel sheet 名
  group: CategoryGroup;
  fullPaths: string[];
}

export interface BrandDim {
  canonical: string;
  tier: YuhongTier | "其他";
  isMine: boolean;
  aliases: string[];
}

export interface SegmentDim {
  direction: string;
  categories: string[];
  focus: boolean; // 重点词（彩砂/防霉/结构胶/抽拉/纳米）
}

export interface ProductDim {
  id: string; // 商品ID2
  name: string;
  category: string;
  brand: string;
  firstWeek: number;
}

// ── 事实表（facts/week-{NN}.json） ───────────────────────────────────────────
export interface FactRow {
  date: string; // "2026-08-03 ~ 2026-08-09"
  rank: number | null;
  trend: string;
  categoryPath: string;
  productName: string;
  productId: string | null;
  productId2: string | null;
  keywords: string | null;
  shopName: string;
  shopType: string;
  platform: "天猫" | "淘宝" | "其他";
  buyers: string | null; // 分桶区间
  visitors: string | null; // 分桶区间（访客量级）
  amount: null; // 预估支付金额，源数据全空
  segmentRaw: string | null;
  alias: string | null;
  sourceMonth: number | null;
  sourceWeek: number | null;
  sourceYear: number | null;
  trendValue: number | null;
  // 派生
  category: string; // 短类目名
  brand: string; // 规范品牌（雨虹系用商品名称判定）
  tier: YuhongTier | null;
  isMine: boolean;
  direction: string;
  week: number;
  weekMonday: string;
}

// ── 周报派生视图（reports/week-{NN}.json） ───────────────────────────────────
export interface QuickMetrics {
  categoryCount: number;
  totalRows: number;
  top10Count: number;
  anomalyCount: number;
  brandCount: number;
  sourceTotalRows: number;
  weekLabel: string;
}

export interface WeekReportMeta {
  week: number;
  weekNum: number;
  trendWeekNums: (number | null)[];
  t0Range: string;
  t1Range: string;
  t2Range: string;
  periodStr: string;
  quickMetrics: QuickMetrics;
}

export interface HomepageBrandEntry {
  category: string;
  brand: string;
  t10: number[];
  t30: number[];
  t100: number[];
  tag: string;
}

export interface HomepageReport {
  coverage: string;
  strongBrands: HomepageBrandEntry[];
  weakBrands: HomepageBrandEntry[];
  narratives: {
    strongBrands: string;
    weakBrands: string;
    strongProducts: string;
    riskProducts: string;
    segmentOpportunities: string;
    priorityAdvice: string;
  };
}

export interface BrandTrend {
  brand: string;
  categoryCount: number;
  t10: number[];
  t30: number[];
  t100: number[];
  tag: string;
  judgment: string;
}

export interface ProductTrend {
  category: string;
  rank: number;
  brand: string;
  productId: string;
  name: string;
  track: (number | null)[]; // T-2 → T-1 → T
  status: string;
  judgment: string;
  direction: string;
  visitors: string; // 访客量级（分桶）
  conversion: string; // 转化率（分桶）
}

export type AnomalyType =
  | "连续两周上升"
  | "连续两周下降"
  | "单周上升超过20名"
  | "单周下降超过20名"
  | "新进前100"
  | "跌出前100";

export interface Anomaly {
  type: AnomalyType;
  category: string;
  brand: string;
  productId: string;
  name: string;
  track: (number | null)[];
  currentRank: number | null;
  previousRank: number | null;
  delta: number | "" | null;
  visitors: string;
  conversion: string;
  direction: string;
  action: string;
  judgment: string;
}

export interface CategoryBrandTrend {
  category: string;
  brand: string;
  t10: number[];
  t30: number[];
  t100: number[];
  tag: string;
  judgment: string;
}

export interface CategoryAnomalyItem {
  name: string;
  brand: string;
  productId: string;
  track: (number | null)[];
  currentRank: number | string;
  delta: string;
  visitors: string;
  conversion: string;
  action: string;
  judgment: string;
}

export interface SegmentTrend {
  direction: string;
  t10: number[];
  t30: number[];
  t100: number[];
  judgment: string;
}

export interface CategoryReport {
  summary: string;
  matrix: string;
  products: string;
  risk: string;
  next: string;
  brandTable: CategoryBrandTrend[];
  top10: ProductTrend[];
  anomalies: Record<AnomalyType, CategoryAnomalyItem[]>;
  segments: SegmentTrend[];
}

export interface WeekReport {
  meta: WeekReportMeta;
  homepage: HomepageReport;
  brandStrength: BrandTrend[];
  top10Products: ProductTrend[];
  anomalies: Anomaly[];
  categories: Record<string, CategoryReport>;
  conclusions?: Conclusion[];
}

// ── 时序（timeseries/*.json，任务 #11 生成） ─────────────────────────────────
export interface BrandTimeseries {
  brand: string;
  isMine: boolean;
  weeks: number[];
  top10: number[];
  top30: number[];
  top100: number[];
  categoryCount: number[];
  consecutiveGrowthWeeks: number;
}

export interface CategoryTimeseries {
  category: string;
  weeks: number[];
  scale: number[]; // 规模 = 访客数
  growth: number[]; // 周环比增长率
  brandCount: number[];
  brandConcentration: number[]; // 品牌集中度 = Top3 品牌入榜商品数 / 品类入榜商品数
  top10Concentration: number[];
  newBrands: number[];
  newProducts: number[];
  yuhongTop100: number[];
}

export interface ProductTimeseries {
  id: string;
  name: string;
  category: string;
  brand: string;
  weeks: number[];
  rank: (number | null)[]; // null = 未入榜
}

export interface BrandCategoryTimeseries {
  brand: string;
  category: string;
  weeks: number[];
  seats: number[]; // Top100 席位
}

export interface SegmentTimeseries {
  direction: string;
  focus: boolean; // 重点词（彩砂/防霉/结构胶/抽拉/纳米）
  weeks: number[];
  seats: number[]; // Top100 席位
  top10: number[];
  scale: number[]; // 规模（访客数中值求和）
  growth4w: number[]; // 近4周增长
  newProducts: number[];
  yuhongSeats: number[];
  brandCount: number[];
  concentration: number[]; // Top3 品牌集中度
  opportunityScore: number[]; // 机会评分（0-100，Python 归一化）
}

// ── 可解释结论（§11） ───────────────────────────────────────────────────────
export type ConclusionPriority = "S" | "A" | "B" | "C";

export interface Conclusion {
  text: string;
  current: number;
  previous: number;
  delta: number;
  affected: string[];
  ruleVersion: string;
  priority: ConclusionPriority;
}

// ── 全局筛选状态（L3） ──────────────────────────────────────────────────────
export type TimeWindow = "单周" | "最近4周" | "最近8周" | "全部周期";
export type MineTier = "东方雨虹" | "雨虹飞鱼" | "雨虹" | "雨虹品牌群";

export interface GlobalFilter {
  week: number; // 默认 32
  startWeek: number;
  endWeek: number;
  window: TimeWindow;
  category: string | "全部";
  brand: string | "全部";
  mine: MineTier;
  rivals: string[]; // 对比品牌 1..5
}

// ── 雨虹品牌群 ───────────────────────────────────────────────────────────────
export const YUHONG_TIERS: readonly YuhongTier[] = ["东方雨虹", "雨虹飞鱼", "雨虹"];
export const YUHONG_GROUP_LABEL = "雨虹品牌群";

/** 判断一个品牌名（可能来自 reports 的 extract_brand 变体）是否属于雨虹系 */
export function isYuhongBrand(brand: string | null | undefined): boolean {
  if (!brand) return false;
  const b = brand.trim();
  return YUHONG_TIERS.some((t) => b === t) || b.includes("雨虹") || b.includes("飞鱼");
}
