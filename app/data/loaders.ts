// 数据载入层 — 从 public/data/*.json 读取，带内存缓存（只读，不重算）
import type {
  BrandCategoryTimeseries,
  BrandDim,
  BrandTimeseries,
  CategoryDim,
  CategoryGroup,
  CategoryTimeseries,
  FactRow,
  ProductDim,
  ProductTimeseries,
  SegmentDim,
  SegmentTimeseries,
  WeekIndex,
  WeekReport,
  YuhongTier,
} from "./schema";

const BASE = "/data";

// ── 缓存 ─────────────────────────────────────────────────────────────────────
const cache = new Map<string, Promise<unknown>>();

function fetchJson<T>(path: string): Promise<T> {
  const key = path;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`${BASE}${path}`).then((res) => {
        if (!res.ok) throw new Error(`加载失败 ${path}: HTTP ${res.status}`);
        return res.json() as Promise<T>;
      }),
    );
  }
  return cache.get(key) as Promise<T>;
}

function pad(week: number): string {
  return String(week).padStart(2, "0");
}

// ── 载入器 ───────────────────────────────────────────────────────────────────
export function loadIndex(): Promise<WeekIndex[]> {
  return fetchJson<WeekIndex[]>("/index.json");
}

export function loadCategories(): Promise<CategoryDim[]> {
  return fetchJson<CategoryDim[]>("/dimensions/categories.json");
}

export function loadBrands(): Promise<BrandDim[]> {
  return fetchJson<BrandDim[]>("/dimensions/brands.json");
}

export function loadSegments(): Promise<SegmentDim[]> {
  return fetchJson<SegmentDim[]>("/dimensions/segments.json");
}

export function loadProducts(): Promise<ProductDim[]> {
  return fetchJson<ProductDim[]>("/dimensions/products.json");
}

export function loadFactWeek(week: number): Promise<FactRow[]> {
  return fetchJson<FactRow[]>(`/facts/week-${pad(week)}.json`);
}

export function loadReport(week: number): Promise<WeekReport> {
  return fetchJson<WeekReport>(`/reports/week-${pad(week)}.json`);
}

export function loadTimeseriesBrands(): Promise<BrandTimeseries[]> {
  return fetchJson<BrandTimeseries[]>("/timeseries/brands.json");
}

export function loadTimeseriesCategories(): Promise<CategoryTimeseries[]> {
  return fetchJson<CategoryTimeseries[]>("/timeseries/categories.json");
}

export function loadTimeseriesProducts(): Promise<ProductTimeseries[]> {
  return fetchJson<ProductTimeseries[]>("/timeseries/products.json");
}

export function loadTimeseriesBrandCategory(): Promise<BrandCategoryTimeseries[]> {
  return fetchJson<BrandCategoryTimeseries[]>("/timeseries/brand_category.json");
}

export function loadTimeseriesSegments(): Promise<SegmentTimeseries[]> {
  return fetchJson<SegmentTimeseries[]>("/timeseries/segments.json");
}

export function loadProductImages(): Promise<Record<string, string>> {
  const key = "/product-images.json";
  if (!cache.has(key)) {
    cache.set(key, fetch(key).then((res) => {
      if (!res.ok) throw new Error(`加载失败 ${key}: HTTP ${res.status}`);
      return res.json();
    }));
  }
  return cache.get(key) as Promise<Record<string, string>>;
}

// ── 选择器（无行偏移） ───────────────────────────────────────────────────────
export function getLatestWeek(index: WeekIndex[]): number {
  return index.reduce((max, w) => Math.max(max, w.week), 1);
}

export function getWeekIndex(index: WeekIndex[], week: number): WeekIndex | undefined {
  return index.find((w) => w.week === week);
}

export function getYuhongBrands(brands: BrandDim[]): BrandDim[] {
  return brands.filter((b) => b.isMine);
}

export function getYuhongBrandByTier(brands: BrandDim[], tier: YuhongTier): BrandDim | undefined {
  return brands.find((b) => b.tier === tier);
}

export function groupCategories(categories: CategoryDim[]): Record<CategoryGroup, CategoryDim[]> {
  const groups: Record<CategoryGroup, CategoryDim[]> = {
    涂料与防水: [],
    胶粘与辅材: [],
    卫浴五金: [],
    厨卫水件: [],
  };
  for (const c of categories) {
    groups[c.group].push(c);
  }
  return groups;
}

export function categoryKeyToGroup(categories: CategoryDim[], key: string): CategoryGroup | undefined {
  return categories.find((c) => c.key === key)?.group;
}
