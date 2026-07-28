"use client";

import { useEffect, useMemo, useState } from "react";

type Cell = string | number | boolean | null;
type Brand = { name: string; top10: string; top30: string; top100: string; tag: string; judgment: string };
type Product = { rank: number; brand: string; id: string; name: string; track: string; status: string; direction: string };
type Segment = { name: string; top10: string; top30: string; top100: string; judgment: string };

const FILE_MAP: Record<string, string> = {
  "美缝/勾缝剂": "05", "防水涂料": "06", "玻璃胶": "07", "地漏": "08", "地坪漆": "09",
  "水性木器漆": "10", "艺术漆": "11", "乳胶漆": "12", "瓷砖胶": "13", "毛巾架": "14",
  "角阀": "15", "面盆龙头": "16", "恒温花洒套装": "17", "厨房龙头": "18", "水槽套餐": "19",
};

function value(row: Cell[] | undefined, index: number) {
  return String(row?.[index] ?? "");
}
function trendLast(trend: string) {
  const parts = trend.split("→");
  return Number(parts.at(-1)) || 0;
}
function trendValues(trend: string) {
  return trend.split("→").map((item) => Number(item) || 0);
}

export function CategoryDashboard({ category }: { category: string }) {
  const [rows, setRows] = useState<Cell[][]>([]);
  useEffect(() => {
    setRows([]);
    fetch(`/data/${FILE_MAP[category]}.json`).then((response) => response.json()).then((data) => setRows(data.values));
  }, [category]);

  const brands = useMemo<Brand[]>(() => rows.slice(13, 44).filter((row) => value(row, 1)).map((row) => ({
    name: value(row, 1), top10: value(row, 2), top30: value(row, 3), top100: value(row, 4), tag: value(row, 5), judgment: value(row, 6),
  })), [rows]);

  const products = useMemo<Product[]>(() => rows.slice(46, 57).filter((row) => Number(row?.[0])).map((row) => ({
    rank: Number(row[0]), brand: value(row, 2), id: value(row, 3), name: value(row, 4), track: value(row, 5),
    status: value(row, 6), direction: value(row, 8),
  })), [rows]);

  const segments = useMemo<Segment[]>(() => rows.slice(90).filter((row) => value(row, 0)).map((row) => ({
    name: value(row, 0), top10: value(row, 1), top30: value(row, 2), top100: value(row, 3), judgment: value(row, 4),
  })), [rows]);

  const expanding = brands.filter((brand) => {
    const values = trendValues(brand.top100);
    return (values.at(-1) ?? 0) > (values[0] ?? 0);
  });
  const shrinking = brands.filter((brand) => {
    const values = trendValues(brand.top100);
    return (values.at(-1) ?? 0) < (values[0] ?? 0);
  });
  const top10Total = brands.reduce((sum, brand) => sum + trendLast(brand.top10), 0);
  const strongest = [...brands].sort((a, b) => trendLast(b.top100) - trendLast(a.top100))[0];
  if (!rows.length) return <div className="category-loading">正在加载 {category} 完整分析…</div>;

  return (
    <div className="category-dashboard">
      <div className="category-head">
        <div><span>品类经营分析</span><h2>{category}</h2><p>第28周 → 第29周 → 第30周</p></div>
        <div className="category-score"><strong>{brands.length}</strong><span>活跃品牌</span></div>
        <div className="category-score red"><strong>{products.length}</strong><span>Top10单品</span></div>
        <div className="category-score"><strong>{segments.length}</strong><span>细分方向</span></div>
      </div>

      <div className="category-signal-kpis">
        <article className="blue"><span>矩阵扩张品牌</span><strong>{expanding.length}</strong><small>{expanding.slice(0, 3).map((item) => item.name).join(" · ") || "暂无"}</small></article>
        <article className="orange"><span>矩阵收缩品牌</span><strong>{shrinking.length}</strong><small>{shrinking.slice(0, 3).map((item) => item.name).join(" · ") || "暂无"}</small></article>
        <article className="green"><span>本周Top10占位</span><strong>{top10Total}</strong><small>头部商品合计</small></article>
        <article className="purple"><span>最强品牌矩阵</span><strong>{strongest?.name ?? "—"}</strong><small>Top100：{strongest ? trendLast(strongest.top100) : 0} 个</small></article>
      </div>

      <div className="category-grid">
        <article className="light-card brand-rank-chart">
          <div className="light-title"><div><span>品牌矩阵</span><h3>三周入榜强度与变化</h3></div><small>Top10 / Top100</small></div>
          <div className="light-bars">
            {brands.slice(0, 15).map((brand, index) => {
              const latest = trendLast(brand.top100);
              const values = trendValues(brand.top100);
              const max = Math.max(...values, 1);
              return <div key={`${brand.name}-${index}`}>
                <b>{index + 1}</b>
                <strong title={brand.name}>{brand.name}</strong>
                <div className="matrix-mini-bars">{values.map((number, valueIndex) => <i key={valueIndex} style={{ height: `${Math.max(16, number / max * 100)}%` }} />)}</div>
                <span>{brand.top100}</span>
                <em className={values[2] > values[0] ? "grow" : values[2] < values[0] ? "shrink" : "flat"}>{brand.tag}</em>
              </div>;
            })}
          </div>
        </article>

        <article className="light-card top-product-chart">
          <div className="light-title"><div><span>头部商品</span><h3>Top10三周轨迹</h3></div><small>排名越小越强</small></div>
          <div className="product-tracks-light">
            {products.map((product) => {
              const values = trendValues(product.track);
              return <div key={product.id}>
                <span className="rank-pill">{product.rank}</span>
                <p><strong>{product.brand}</strong><small>{product.direction} · {product.status}</small></p>
                <div>{values.map((number, index) => <i key={index} style={{ height: `${Math.max(12, 92 - number * 5)}%` }}><b>{number}</b></i>)}</div>
              </div>;
            })}
          </div>
        </article>

        <article className="light-card segment-chart">
          <div className="light-title"><div><span>细分机会</span><h3>产品方向规模与头部性</h3></div><small>Top10 / Top30 / Top100</small></div>
          <div className="segment-bubbles">
            {segments.map((segment, index) => {
              const top100 = trendLast(segment.top100);
              const top10 = trendLast(segment.top10);
              return <div key={`${segment.name}-${index}`} style={{ "--size": `${Math.max(58, Math.min(112, 55 + top100 * 1.3))}px` } as React.CSSProperties}>
                <strong>{segment.name}</strong><b>{top100}</b><small>Top10：{top10}</small><span>{segment.judgment}</span>
              </div>;
            })}
          </div>
        </article>

        <article className="light-card conclusion-card">
          <div className="light-title"><div><span>行动建议</span><h3>本周关注重点</h3></div></div>
          <div className="action-cards">
            <div><span>品牌</span><strong>{expanding[0]?.name ?? strongest?.name ?? "观察头部品牌"}</strong><small>优先跟进矩阵扩张</small></div>
            <div><span>单品</span><strong>{products.find((item) => item.status.includes("上升") || item.status.includes("冲入"))?.brand ?? products[0]?.brand ?? "—"}</strong><small>复盘排名改善原因</small></div>
            <div><span>细分</span><strong>{segments.sort((a, b) => trendLast(b.top100) - trendLast(a.top100))[0]?.name ?? "—"}</strong><small>关注Top100规模</small></div>
          </div>
          <div className="decision-scale">
            <span>头部集中</span><i><b style={{ width: `${Math.min(100, products.filter((item) => item.rank <= 3).length * 25)}%` }} /></i><strong>{products.filter((item) => item.rank <= 3).length}个Top3</strong>
          </div>
          <div className="decision-scale">
            <span>上升商品</span><i><b style={{ width: `${Math.min(100, products.filter((item) => item.status.includes("上升") || item.status.includes("冲入")).length * 25)}%` }} /></i><strong>{products.filter((item) => item.status.includes("上升") || item.status.includes("冲入")).length}个</strong>
          </div>
        </article>
      </div>
    </div>
  );
}
