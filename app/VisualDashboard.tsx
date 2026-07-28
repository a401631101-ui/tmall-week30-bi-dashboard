"use client";

import { useEffect, useMemo, useState } from "react";

type Cell = string | number | boolean | null;
type Brand = { name: string; top10: number; top30: number; top100: number; categories: number };
type Product = { rank: number; category: string; brand: string; id: string; name: string; track: string; status: string; direction: string };
type Rising = Product & { change: number; judgment: string };
type YuhongCategory = { category: string; top10: string; top30: string; top100: string; tag: string };

const CATEGORY_FILES = ["05","06","07","08","09","10","11","12","13","14","15","16","17","18","19"];
const categoryGroups = [
  { name: "涂料与防水", icon: "💧", categories: ["防水涂料","地坪漆","水性木器漆","艺术漆","乳胶漆"], tone: "blue" },
  { name: "胶粘与辅材", icon: "🧱", categories: ["美缝/勾缝剂","玻璃胶","瓷砖胶"], tone: "orange" },
  { name: "卫浴五金", icon: "🔩", categories: ["地漏","毛巾架","角阀"], tone: "green" },
  { name: "厨卫水件", icon: "🚿", categories: ["面盆龙头","恒温花洒套装","厨房龙头","水槽套餐"], tone: "purple" },
];

function text(row: Cell[] | undefined, index: number) { return String(row?.[index] ?? ""); }
function last(trend: string) { return Number(trend.split("→").at(-1)) || 0; }
function values(trend: string) { return trend.split("→").map((item) => Number(item) || 0); }
function productUrl(id: string) { return `https://detail.tmall.com/item.htm?id=${encodeURIComponent(id)}`; }

export function VisualDashboard() {
  const [yuhong, setYuhong] = useState<YuhongCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rising, setRising] = useState<Rising[]>([]);

  useEffect(() => {
    Promise.all([
      ...CATEGORY_FILES.map((file) => fetch(`/data/${file}.json`).then((response) => response.json())),
      fetch("/data/03.json").then((response) => response.json()),
    ]).then((payloads) => {
      const categoryPayloads = payloads.slice(0, CATEGORY_FILES.length);
      const brandMap = new Map<string, Brand>();
      const yuhongRows: YuhongCategory[] = [];
      const productRows: Product[] = [];
      categoryPayloads.forEach((payload) => {
        const rows: Cell[][] = payload.values;
        rows.slice(13, 44).forEach((row) => {
          if (!text(row, 1)) return;
          const name = text(row, 1);
          const current = brandMap.get(name) ?? { name, top10: 0, top30: 0, top100: 0, categories: 0 };
          current.top10 += last(text(row, 2));
          current.top30 += last(text(row, 3));
          current.top100 += last(text(row, 4));
          current.categories += 1;
          brandMap.set(name, current);
          if (name === "东方雨虹") yuhongRows.push({ category: text(row, 0), top10: text(row, 2), top30: text(row, 3), top100: text(row, 4), tag: text(row, 5) });
        });
        rows.slice(46, 57).forEach((row) => {
          if (!Number(row?.[0])) return;
          productRows.push({ rank: Number(row[0]), category: text(row, 1), brand: text(row, 2), id: text(row, 3), name: text(row, 4), track: text(row, 5), status: text(row, 6), direction: text(row, 8) });
        });
      });
      const anomalyRows: Cell[][] = payloads.at(-1).values;
      const risingRows = anomalyRows.slice(2).filter((row) => text(row, 0).includes("上升") && Number(row[6]) <= 10).map((row) => ({
        rank: Number(row[6]), category: text(row, 1), brand: text(row, 2), id: text(row, 3), name: text(row, 4), track: text(row, 5),
        status: text(row, 0), direction: text(row, 11), change: Number(row[8]) || 0, judgment: text(row, 13),
      })).sort((a, b) => b.change - a.change);
      setYuhong(yuhongRows);
      setBrands([...brandMap.values()].sort((a, b) => b.top100 - a.top100).slice(0, 10));
      setProducts(productRows.sort((a, b) => a.rank - b.rank || a.category.localeCompare(b.category, "zh")).slice(0, 10));
      setRising(risingRows.slice(0, 10));
    });
  }, []);

  const yuhongTotal = useMemo(() => yuhong.reduce((acc, item) => ({
    top10: acc.top10 + last(item.top10), top30: acc.top30 + last(item.top30), top100: acc.top100 + last(item.top100),
  }), { top10: 0, top30: 0, top100: 0 }), [yuhong]);
  const strongest = [...yuhong].sort((a, b) => last(b.top100) - last(a.top100))[0];
  const brandMax = Math.max(...brands.map((item) => item.top100), 1);

  return (
    <section className="yuhong-cockpit">
      <div className="yuhong-hero">
        <div className="yuhong-mark">YR</div>
        <div><span>东方雨虹 · 天猫重点品类</span><h2>品牌发展驾驶舱</h2><p>聚焦品牌覆盖、头部占位、爆品表现与本周增长机会</p></div>
        <div className="yuhong-rank"><small>跨品类Top100强度</small><strong>第 4</strong><span>48 个入榜商品</span></div>
      </div>

      <div className="yuhong-kpis">
        <article className="blue"><i>🧭</i><span>覆盖品类</span><strong>{yuhong.length}</strong><small>15个重点品类中</small></article>
        <article className="red"><i>🏆</i><span>Top10席位</span><strong>{yuhongTotal.top10}</strong><small>头部商品占位</small></article>
        <article className="green"><i>📈</i><span>Top30席位</span><strong>{yuhongTotal.top30}</strong><small>核心商品矩阵</small></article>
        <article className="purple"><i>🧩</i><span>Top100席位</span><strong>{yuhongTotal.top100}</strong><small>全域品牌矩阵</small></article>
        <article className="orange"><i>⭐</i><span>最强品类</span><strong>{strongest?.category ?? "—"}</strong><small>Top100 {strongest ? last(strongest.top100) : 0} 席</small></article>
      </div>

      <div className="yuhong-grid">
        <article className="viz-card yuhong-category-chart">
          <div className="viz-title"><div><span>雨虹品类版图</span><h2>7个品类入榜趋势</h2></div><em>第28周 → 第29周 → 第30周</em></div>
          <div className="yuhong-category-rows">
            {yuhong.map((item) => (
              <div key={item.category}>
                <strong>{item.category}</strong>
                {(["top10","top30","top100"] as const).map((metric) => {
                  const trend = item[metric]; const points = values(trend); const max = Math.max(...points, 1);
                  return <div className={`trend-metric ${metric}`} key={metric}><span>{metric.toUpperCase()}</span><i>{points.map((point, index) => <b key={index} style={{ height: `${Math.max(18, point / max * 100)}%` }} />)}</i><em>{trend}</em></div>;
                })}
                <small>{item.tag}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="viz-card market-group-chart">
          <div className="viz-title"><div><span>市场结构</span><h2>15品类同类型分布</h2></div><em>按消费场景归组</em></div>
          <div className="market-groups">
            {categoryGroups.map((group) => <div className={group.tone} key={group.name}><i>{group.icon}</i><strong>{group.name}</strong><b>{group.categories.length}</b><span>{group.categories.join(" · ")}</span></div>)}
          </div>
        </article>

        <article className="viz-card top-brand-chart">
          <div className="viz-title"><div><span>品牌竞争</span><h2>Top10品牌入榜强度</h2></div><em>Top100商品数合计</em></div>
          <div className="top-brand-bars">
            {brands.map((brand, index) => <div className={brand.name === "东方雨虹" ? "yuhong" : ""} key={brand.name}><b>{index + 1}</b><strong>{brand.name}{brand.name === "东方雨虹" && <small>我方</small>}</strong><i><span style={{ width: `${brand.top100 / brandMax * 100}%` }} /></i><em>{brand.top100}</em><small>{brand.categories}品类</small></div>)}
          </div>
        </article>

        <article className="viz-card top10-products">
          <div className="viz-title"><div><span>单品赛道</span><h2>本周Top10产品</h2></div><em>跨品类头部商品</em></div>
          <div className="product-card-grid">
            {products.map((item) => <a href={productUrl(item.id)} target="_blank" rel="noreferrer" className={item.brand === "东方雨虹" ? "yuhong" : ""} key={`${item.category}-${item.id}`}>
              <div className="product-thumb"><span>官方主图</span><small>打开天猫 · {item.id.slice(-6)}</small></div>
              <p><b>#{item.rank}</b><strong>{item.brand}</strong><span>{item.category} · {item.direction}</span></p>
              <h3 title={item.name}>{item.name}</h3><footer><em>{item.track}</em><small>{item.status}</small></footer>
            </a>)}
          </div>
        </article>

        <article className="viz-card rising-products">
          <div className="viz-title"><div><span>增长雷达</span><h2>本周上升明显的Top10产品</h2></div><em>排名改善幅度</em></div>
          <div className="rising-list">
            {rising.map((item, index) => <a href={productUrl(item.id)} target="_blank" rel="noreferrer" key={item.id}><b>{index + 1}</b><span className="rise-icon">🚀</span><p><strong>{item.brand} · {item.direction}</strong><small>{item.category}｜{item.name}</small></p><em>{item.track}</em><i>+{item.change}</i></a>)}
          </div>
        </article>
      </div>
    </section>
  );
}
