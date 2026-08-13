// Data processing utilities for parsing Excel-derived JSON into typed objects

// ── Types ────────────────────────────────────────────────────────────────────

export interface BrandRecord {
  name: string;
  categories: number;
  top10Trend: number[];
  top30Trend: number[];
  top100Trend: number[];
  top10TrendStr: string;
  top30TrendStr: string;
  top100TrendStr: string;
  tag: string;
  judgment: string;
}

export interface ProductRecord {
  rank: number;
  category: string;
  brand: string;
  id: string;
  name: string;
  track: string;
  status: string;
  judgment: string;
  direction: string;
  popularity: string;
  conversion: string;
}

export interface AnomalyRecord {
  type: string;
  category: string;
  brand: string;
  id: string;
  name: string;
  track: string;
  rank: number | string;
  prevRank: number | string;
  delta: number;
  popularity: string;
  conversion: string;
  direction: string;
  action: string;
  judgment: string;
}

export interface SegmentRecord {
  direction: string;
  top10Trend: string;
  top30Trend: string;
  top100Trend: string;
  judgment: string;
}

export interface CategoryBrandRecord {
  category: string;
  brand: string;
  top10Trend: string;
  top30Trend: string;
  top100Trend: string;
  tag: string;
  judgment: string;
}

export interface CategoryAnomalyZone {
  upTwoWeeks: AnomalyRecord[];
  downTwoWeeks: AnomalyRecord[];
  upBigJump: AnomalyRecord[];
  downBigDrop: AnomalyRecord[];
  newEntry: AnomalyRecord[];
  exitTop100: AnomalyRecord[];
}

export interface CategoryHomepage {
  title: string;
  generalJudgment: string;
  strongBrands: string;
  weakBrands: string;
  strongProducts: string;
  riskProducts: string;
  segmentOpportunities: string;
  nextWeekWatch: string;
  kpis: { label: string; value: string }[];
}

export interface CategorySummary {
  category: string;
  homepage: CategoryHomepage | null;
  brands: CategoryBrandRecord[];
  top10Products: ProductRecord[];
  anomalyZone: CategoryAnomalyZone;
  segments: SegmentRecord[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseTrendNumbers(trend: string): number[] {
  return trend.split("→").map((s) => parseInt(s.trim(), 10));
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function safeNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// ── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Parse 01.json — Brand Strength Board
 * Data starts at row index 3 (row 4 in Excel)
 */
export function parseBrandStrengthBoard(values: unknown[][]): BrandRecord[] {
  const brands: BrandRecord[] = [];
  for (let i = 3; i < values.length; i++) {
    const row = values[i];
    if (!row || !row[0]) continue;
    const name = safeStr(row[0]);
    if (!name || name === "品牌") continue;

    const top10Str = safeStr(row[2]);
    const top30Str = safeStr(row[3]);
    const top100Str = safeStr(row[4]);

    brands.push({
      name,
      categories: safeNum(row[1]),
      top10Trend: parseTrendNumbers(top10Str),
      top30Trend: parseTrendNumbers(top30Str),
      top100Trend: parseTrendNumbers(top100Str),
      top10TrendStr: top10Str,
      top30TrendStr: top30Str,
      top100TrendStr: top100Str,
      tag: safeStr(row[5]),
      judgment: safeStr(row[6]),
    });
  }
  return brands;
}

/**
 * Parse 02.json — All-Category Top10 Products
 * Data starts at row index 1 (row 2 in Excel)
 */
export function parseTop10Products(values: unknown[][]): ProductRecord[] {
  const products: ProductRecord[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || !row[0]) continue;
    const category = safeStr(row[0]);
    if (!category || category === "品类") continue;

    products.push({
      rank: safeNum(row[1]),
      category,
      brand: safeStr(row[2]),
      id: safeStr(row[3]),
      name: safeStr(row[4]),
      track: safeStr(row[5]),
      status: safeStr(row[6]),
      judgment: safeStr(row[7]),
      direction: safeStr(row[8]),
      popularity: safeStr(row[9]),
      conversion: safeStr(row[10]),
    });
  }
  return products;
}

/**
 * Parse 03.json — All-Category Anomaly Detail
 * Data starts at row index 1 (row 2 in Excel)
 */
export function parseAnomalyDetail(values: unknown[][]): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || !row[0]) continue;
    const type = safeStr(row[0]);
    if (!type || type === "异动类型") continue;

    anomalies.push({
      type,
      category: safeStr(row[1]),
      brand: safeStr(row[2]),
      id: safeStr(row[3]),
      name: safeStr(row[4]),
      track: safeStr(row[5]),
      rank: safeNum(row[6]) || safeStr(row[6]),
      prevRank: safeNum(row[7]) || safeStr(row[7]),
      delta: safeNum(row[8]),
      popularity: safeStr(row[9]),
      conversion: safeStr(row[10]),
      direction: safeStr(row[11]),
      action: safeStr(row[12]),
      judgment: safeStr(row[13]),
    });
  }
  return anomalies;
}

/**
 * Parse 04.json — All-Category Anomaly Zones (or category sheet anomaly zones)
 * Uses the left/right split layout. Parses all 6 zones.
 */
export function parseAnomalyZone(values: unknown[][]): CategoryAnomalyZone {
  const result: CategoryAnomalyZone = {
    upTwoWeeks: [],
    downTwoWeeks: [],
    upBigJump: [],
    downBigDrop: [],
    newEntry: [],
    exitTop100: [],
  };

  let section: "twoWeeks" | "bigJump" | "entry" | null = null;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row) continue;

    const firstCell = safeStr(row[0]);

    if (firstCell.includes("连续两周上升")) {
      section = "twoWeeks";
      continue;
    }
    if (firstCell.includes("单周上升超过20名")) {
      section = "bigJump";
      continue;
    }
    if (firstCell.includes("新进前100")) {
      section = "entry";
      continue;
    }
    if (
      firstCell.includes("关键词") ||
      firstCell.includes("商品名称") ||
      !firstCell
    )
      continue;

    if (section && firstCell) {
      // Left side (columns 0-9): positive signals
      const leftRecord = makeAnomalyFromZone(row, 0);
      if (leftRecord) {
        if (section === "twoWeeks") result.upTwoWeeks.push(leftRecord);
        else if (section === "bigJump") result.upBigJump.push(leftRecord);
        else if (section === "entry") result.newEntry.push(leftRecord);
      }

      // Right side (columns 10-20): negative signals
      const rightRecord = makeAnomalyFromZone(row, 11);
      if (rightRecord) {
        if (section === "twoWeeks") result.downTwoWeeks.push(rightRecord);
        else if (section === "bigJump") result.downBigDrop.push(rightRecord);
        else if (section === "entry") result.exitTop100.push(rightRecord);
      }
    }
  }

  return result;
}

function makeAnomalyFromZone(
  row: unknown[],
  offset: number,
): AnomalyRecord | null {
  const name = safeStr(row[offset]);
  if (!name) return null;

  const deltaStr = safeStr(row[offset + 5]);
  const delta = parseInt(deltaStr, 10);

  return {
    type: "",
    category: "",
    brand: safeStr(row[offset + 1]),
    id: safeStr(row[offset + 2]),
    name,
    track: safeStr(row[offset + 3]),
    rank: safeStr(row[offset + 4]) || safeNum(row[offset + 4]),
    prevRank: "",
    delta: isNaN(delta) ? 0 : delta,
    popularity: safeStr(row[offset + 6]),
    conversion: safeStr(row[offset + 7]),
    direction: "",
    action: safeStr(row[offset + 8]),
    judgment: safeStr(row[offset + 9]),
  };
}

/**
 * Parse a category sheet (05-19.json) — extract all 5 sections
 */
export function parseCategorySheet(values: unknown[][]): CategorySummary {
  let category = "";
  const brands: CategoryBrandRecord[] = [];
  const top10Products: ProductRecord[] = [];
  const segments: SegmentRecord[] = [];
  let anomalyZone: CategoryAnomalyZone = {
    upTwoWeeks: [],
    downTwoWeeks: [],
    upBigJump: [],
    downBigDrop: [],
    newEntry: [],
    exitTop100: [],
  };
  let homepage: CategoryHomepage | null = null;

  let section: "homepage" | "brands" | "top10" | "anomaly" | "segments" | null =
    null;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row) continue;

    const firstCell = safeStr(row[0]);

    // Detect sections
    if (firstCell.includes("一、类目总判断")) {
      section = "homepage";
      homepage = {
        title: "",
        generalJudgment: "",
        strongBrands: "",
        weakBrands: "",
        strongProducts: "",
        riskProducts: "",
        segmentOpportunities: "",
        nextWeekWatch: "",
        kpis: [],
      };
      continue;
    }
    if (firstCell.includes("二、品牌占位趋势")) {
      section = "brands";
      continue;
    }
    if (firstCell.includes("三、当周Top10")) {
      section = "top10";
      continue;
    }
    if (firstCell.includes("四、异动分区")) {
      section = "anomaly";
      // Pass remaining rows to anomaly zone parser
      anomalyZone = parseAnomalyZone(values.slice(i));
      continue;
    }
    if (firstCell.includes("五、细分产品机会")) {
      section = "segments";
      continue;
    }

    // Title row
    if (firstCell.includes("｜第32周竞品排名")) {
      category = firstCell.split("｜")[0].trim();
      continue;
    }

    // Process section
    if (section === "homepage" && homepage) {
      const colA = firstCell;
      const colB = safeStr(row[1]);
      if (colA === "结论类型" || colA === "模块") continue;
      if (colA === "类目格局") homepage.generalJudgment = colB;
      else if (colA === "品牌矩阵判断") {
        // Split into strong/weak
        const parts = colB.split("收缩/风险：");
        if (parts.length === 2) {
          homepage.strongBrands = parts[0].replace("增强：", "").trim();
          homepage.weakBrands = parts[1].trim();
        }
      } else if (colA === "单品绝对实力") homepage.strongProducts = colB;
      else if (colA === "风险提示") homepage.riskProducts = colB;
      else if (colA === "下周观察") homepage.nextWeekWatch = colB;
    }

    if (section === "brands") {
      if (firstCell === "品类" || !row[1]) continue;
      brands.push({
        category: category || safeStr(row[0]),
        brand: safeStr(row[1]),
        top10Trend: safeStr(row[2]),
        top30Trend: safeStr(row[3]),
        top100Trend: safeStr(row[4]),
        tag: safeStr(row[5]),
        judgment: safeStr(row[6]),
      });
    }

    if (section === "top10") {
      if (firstCell === "本周排名" || !row[2]) continue;
      top10Products.push({
        rank: safeNum(row[0]),
        category: category || safeStr(row[1]),
        brand: safeStr(row[2]),
        id: safeStr(row[3]),
        name: safeStr(row[4]),
        track: safeStr(row[5]),
        status: safeStr(row[6]),
        judgment: safeStr(row[7]),
        direction: safeStr(row[8]),
        popularity: safeStr(row[9]),
        conversion: safeStr(row[10]),
      });
    }

    if (section === "segments") {
      if (firstCell === "细分方向" || !firstCell) continue;
      segments.push({
        direction: firstCell,
        top10Trend: safeStr(row[1]),
        top30Trend: safeStr(row[2]),
        top100Trend: safeStr(row[3]),
        judgment: safeStr(row[4]),
      });
    }
  }

  return { category, homepage, brands, top10Products, anomalyZone, segments };
}

/**
 * Parse 00.json — Homepage overview
 */
export function parseHomepage(values: unknown[][]): {
  kpis: { label: string; value: string }[];
  strongBrands: string;
  weakBrands: string;
  strongProducts: string;
  riskProducts: string;
  segmentOpportunities: string;
  nextWeekWatch: string;
  generalJudgment: string;
} {
  const result = {
    kpis: [] as { label: string; value: string }[],
    strongBrands: "",
    weakBrands: "",
    strongProducts: "",
    riskProducts: "",
    segmentOpportunities: "",
    nextWeekWatch: "",
    generalJudgment: "",
  };

  for (const row of values) {
    const colA = safeStr(row[0]);
    const colB = safeStr(row[1]);

    if (colA === "本周总判断") result.generalJudgment = colB;
    else if (colA === "强势品牌") result.strongBrands = colB;
    else if (colA === "走弱品牌") result.weakBrands = colB;
    else if (colA === "强势单品") result.strongProducts = colB;
    else if (colA === "风险单品") result.riskProducts = colB;
    else if (colA === "细分机会") result.segmentOpportunities = colB;
    else if (colA === "下周观察") result.nextWeekWatch = colB;
  }

  // Parse KPI grid: find the "指标1" row
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (safeStr(row[0]) === "指标1" && safeStr(row[2]) === "指标2") {
      // Next row has the values
      if (i + 1 < values.length) {
        const kpiRow = values[i + 1];
        result.kpis = [
          { label: safeStr(kpiRow[0]), value: safeStr(kpiRow[1]) },
          { label: safeStr(kpiRow[2]), value: safeStr(kpiRow[3]) },
          { label: safeStr(kpiRow[4]), value: safeStr(kpiRow[5]) },
          { label: safeStr(kpiRow[6]), value: safeStr(kpiRow[7]) },
        ];
      }
      break;
    }
    // Alternate format: "二、快速指标" followed by data rows
    if (safeStr(row[0]) === "指标1") {
      if (i + 1 < values.length) {
        const kpiRow = values[i + 1];
        if (kpiRow) {
          result.kpis = [
            { label: safeStr(row[0]), value: safeStr(row[1]) },
            { label: safeStr(row[2]), value: safeStr(row[3]) },
            { label: safeStr(row[4]), value: safeStr(row[5]) },
            { label: safeStr(row[6]), value: safeStr(row[7]) },
          ];
        }
      }
      break;
    }
  }

  return result;
}

/**
 * Determine badge tone from judgment string
 */
export function getJudgmentTone(
  judgment: string,
): "positive" | "danger" | "warning" | "neutral" {
  const j = judgment.toLowerCase();
  if (
    j.includes("强势增强") ||
    j.includes("品牌占位扩大") ||
    j.includes("双增强") ||
    j.includes("矩阵扩张") ||
    j.includes("连续扩张")
  )
    return "positive";
  if (
    j.includes("重点预警") ||
    j.includes("全面走弱") ||
    j.includes("连续收缩")
  )
    return "danger";
  if (
    j.includes("收缩") ||
    j.includes("效率下降") ||
    j.includes("走弱") ||
    j.includes("回落")
  )
    return "warning";
  return "neutral";
}

export function getStatusTone(
  status: string,
): "positive" | "danger" | "warning" | "neutral" {
  if (status.includes("爆品") || status.includes("上升") || status.includes("冲入"))
    return "positive";
  if (status.includes("回落") || status.includes("走弱"))
    return "danger";
  if (status.includes("波动"))
    return "warning";
  return "neutral";
}

/** Parse trend string like "16→17→16" into display with direction indicators */
export function trendDisplay(
  trend: string,
): { values: number[]; max: number } {
  const values = parseTrendNumbers(trend);
  return { values, max: Math.max(...values, 1) };
}
