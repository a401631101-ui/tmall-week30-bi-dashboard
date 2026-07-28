"use client";

import { useMemo, useState } from "react";

const categories = [
  "全品类",
  "美缝/勾缝剂",
  "防水涂料",
  "玻璃胶",
  "地漏",
  "地坪漆",
  "水性木器漆",
  "艺术漆",
  "乳胶漆",
  "瓷砖胶",
  "毛巾架",
  "角阀",
  "面盆龙头",
  "恒温花洒套装",
  "厨房龙头",
  "水槽套餐",
];

const brands = [
  { name: "潜水艇", categories: 7, top10: [16, 17, 16], top30: [50, 46, 47], top100: [120, 121, 112], status: "重点预警", tone: "danger" },
  { name: "九牧", categories: 7, top10: [18, 21, 20], top30: [34, 40, 38], top100: [113, 114, 105], status: "重点预警", tone: "danger" },
  { name: "立邦", categories: 8, top10: [6, 8, 6], top30: [23, 29, 29], top100: [60, 55, 64], status: "效率下降", tone: "warning" },
  { name: "东方雨虹", categories: 7, top10: [9, 7, 6], top30: [20, 18, 17], top100: [46, 46, 48], status: "矩阵扩张", tone: "positive" },
  { name: "三棵树", categories: 8, top10: [12, 13, 13], top30: [24, 24, 22], top100: [47, 45, 47], status: "品牌占位扩大", tone: "positive" },
  { name: "瓦克", categories: 1, top10: [5, 5, 5], top30: [12, 12, 11], top100: [19, 19, 18], status: "腰部收缩", tone: "warning" },
];

const products = [
  { rank: 1, category: "美缝/勾缝剂", brand: "东方雨虹", id: "607352542104", track: "2 → 3 → 1", status: "绝对爆品", direction: "防霉", popularity: "2.5万–5万", conversion: "2.0%–10%" },
  { rank: 2, category: "美缝/勾缝剂", brand: "三棵树", id: "581903740374", track: "4 → 2 → 2", status: "稳居Top10", direction: "防霉", popularity: "2.5万–5万", conversion: "2.0%–10%" },
  { rank: 3, category: "美缝/勾缝剂", brand: "房屋医生", id: "38629407528", track: "6 → 4 → 3", status: "连续上升", direction: "防霉", popularity: "2.5万–5万", conversion: "2.0%–10%" },
  { rank: 1, category: "防水涂料", brand: "沃特浦", id: "593992095796", track: "1 → 1 → 1", status: "绝对爆品", direction: "室内防水", popularity: "1万–2.5万", conversion: "1.0%–5.0%" },
  { rank: 2, category: "防水涂料", brand: "东方雨虹", id: "660115922407", track: "2 → 2 → 2", status: "绝对爆品", direction: "防水", popularity: "1万–2.5万", conversion: "1.0%–5.0%" },
  { rank: 1, category: "厨房龙头", brand: "九牧", id: "535941363856", track: "4 → 3 → 1", status: "连续上升", direction: "抽拉", popularity: "1万–2.5万", conversion: "1.0%–5.0%" },
  { rank: 8, category: "水槽套餐", brand: "九牧", id: "971162116267", track: "14 → 11 → 8", status: "冲入Top10", direction: "不锈钢", popularity: "1万–2.5万", conversion: "1.0%–5.0%" },
];

const anomalies = {
  "机会": [
    { product: "立邦竹炭瓷净抗甲醛五合一乳胶漆", brand: "立邦", category: "乳胶漆", track: "99 → 30 → 11", delta: "+19", action: "跟踪承接与素材打法" },
    { product: "九牧抽拉式厨房冷热水龙头", brand: "九牧", category: "厨房龙头", track: "4 → 3 → 1", delta: "+2", action: "对标价格和活动节奏" },
    { product: "JOTUN佐敦淑女北欧秘境乳胶漆", brand: "佐敦", category: "乳胶漆", track: "7 → 60 → 2", delta: "+58", action: "核查活动与内容拉动" },
  ],
  "风险": [
    { product: "三棵树云绘内墙乳胶漆", brand: "三棵树", category: "乳胶漆", track: "4 → 6 → 8", delta: "−2", action: "关注竞品替代" },
    { product: "三棵树内墙翻新补墙漆", brand: "三棵树", category: "乳胶漆", track: "8 → 11 → 15", delta: "−4", action: "检查链接权重" },
    { product: "多乐士儿童乳胶漆森呼吸", brand: "多乐士", category: "乳胶漆", track: "9 → 14 → 47", delta: "−33", action: "核查活动、库存与投放" },
  ],
};

function Trend({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <span className="trend" aria-label={`趋势 ${values.join(" 到 ")}`}>
      {values.map((value, index) => (
        <i key={index} style={{ height: `${Math.max(18, (value / max) * 100)}%` }} />
      ))}
      <b>{values.join("→")}</b>
    </span>
  );
}

export default function Home() {
  const [category, setCategory] = useState("全品类");
  const [anomalyTab, setAnomalyTab] = useState<keyof typeof anomalies>("机会");
  const [query, setQuery] = useState("");

  const visibleProducts = useMemo(() => {
    return products.filter((item) => {
      const inCategory = category === "全品类" || item.category === category;
      const text = `${item.brand}${item.id}${item.category}${item.direction}`.toLowerCase();
      return inCategory && text.includes(query.trim().toLowerCase());
    });
  }, [category, query]);

  return (
    <main>
      <header className="topbar">
        <div className="brand-mark">TM</div>
        <div>
          <p className="eyebrow">MARKET INTELLIGENCE · WEEK 30</p>
          <h1>天猫重点品类市场竞品看板</h1>
        </div>
        <div className="period">
          <span>数据周期</span>
          <strong>2026.07.20 — 07.26</strong>
        </div>
      </header>

      <section className="controlbar" aria-label="看板筛选">
        <label>
          <span>分析品类</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="scope-note">
          <span className="live-dot" />
          数据范围包含天猫与淘宝 · 最近三周对比
        </div>
        <label className="search">
          <span>搜索</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="品牌 / 商品ID / 细分方向" />
        </label>
      </section>

      <section className="hero-grid">
        <article className="executive">
          <div className="section-heading">
            <div><span>01</span><h2>本周经营判断</h2></div>
            <span className="badge positive">市场稳定 · 局部换位</span>
          </div>
          <p className="lead">
            头部爆品仍然稳定，但品牌矩阵正在分化。汉斯格雅、九牧、卡贝、悍高与三棵树出现扩张信号；潜水艇、九牧部分卫浴线及瓦克腰部商品有所收缩。
          </p>
          <div className="signal-grid">
            <div><span>强势品牌</span><strong>汉斯格雅 · 九牧 · 卡贝</strong><small>头部稳固 / 矩阵扩张</small></div>
            <div><span>重点风险</span><strong>潜水艇 · 瓦克</strong><small>Top100 占位连续收缩</small></div>
            <div><span>机会方向</span><strong>防霉 · 室内防水 · 不锈钢</strong><small>更多商品进入Top100</small></div>
          </div>
        </article>

        <article className="category-pulse">
          <div className="section-heading compact"><div><span>02</span><h2>品类竞争脉搏</h2></div></div>
          <div className="pulse-row"><span>美缝/勾缝剂</span><i><b style={{ width: "92%" }} /></i><strong>高竞争</strong></div>
          <div className="pulse-row"><span>防水涂料</span><i><b style={{ width: "84%" }} /></i><strong>高竞争</strong></div>
          <div className="pulse-row"><span>乳胶漆</span><i><b style={{ width: "77%" }} /></i><strong>换位中</strong></div>
          <div className="pulse-row"><span>厨房龙头</span><i><b style={{ width: "68%" }} /></i><strong>机会</strong></div>
          <div className="pulse-row"><span>水槽套餐</span><i><b style={{ width: "62%" }} /></i><strong>机会</strong></div>
        </article>
      </section>

      <section className="kpis">
        <article><span>覆盖品类</span><strong>15</strong><small>重点家装类目</small></article>
        <article><span>T周排名商品</span><strong>1,500</strong><small>每品类 Top100</small></article>
        <article><span>跟踪品牌</span><strong>567</strong><small>跨品类品牌池</small></article>
        <article><span>Top10单品</span><strong>150</strong><small>头部绝对实力</small></article>
        <article className="alert"><span>异动记录</span><strong>1,249</strong><small>机会与风险合计</small></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel brand-panel">
          <div className="section-heading">
            <div><span>03</span><h2>品牌强度总榜</h2></div>
            <p>三周入榜商品数 · T-2 → T-1 → T</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>品牌</th><th>覆盖品类</th><th>Top10</th><th>Top30</th><th>Top100</th><th>判断</th></tr></thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.name}>
                    <td><strong>{brand.name}</strong></td>
                    <td>{brand.categories}</td>
                    <td><Trend values={brand.top10} /></td>
                    <td><Trend values={brand.top30} /></td>
                    <td><Trend values={brand.top100} /></td>
                    <td><span className={`badge ${brand.tone}`}>{brand.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel action-panel">
          <div className="section-heading">
            <div><span>04</span><h2>优先行动清单</h2></div>
            <div className="tabs">
              {(["机会", "风险"] as const).map((tab) => (
                <button key={tab} className={anomalyTab === tab ? "active" : ""} onClick={() => setAnomalyTab(tab)}>{tab}</button>
              ))}
            </div>
          </div>
          <div className="action-list">
            {anomalies[anomalyTab].map((item, index) => (
              <div className="action-item" key={item.product}>
                <span className={`rank-circle ${anomalyTab === "风险" ? "risk" : ""}`}>{index + 1}</span>
                <div><strong>{item.product}</strong><p>{item.category} · {item.brand} · {item.track}</p><small>{item.action}</small></div>
                <b className={anomalyTab === "风险" ? "down" : "up"}>{item.delta}</b>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel product-panel">
        <div className="section-heading">
          <div><span>05</span><h2>Top10 单品绝对实力追踪</h2></div>
          <p>{category} · 显示 {visibleProducts.length} 条代表记录</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>本周</th><th>品类</th><th>品牌</th><th>商品ID</th><th>三周轨迹</th><th>状态</th><th>细分方向</th><th>搜索人气</th><th>转化率</th></tr></thead>
            <tbody>
              {visibleProducts.map((item) => (
                <tr key={`${item.category}-${item.id}`}>
                  <td><span className="product-rank">{item.rank}</span></td>
                  <td>{item.category}</td>
                  <td><strong>{item.brand}</strong></td>
                  <td className="mono">{item.id}</td>
                  <td className="mono track-text">{item.track}</td>
                  <td><span className={`badge ${item.status.includes("爆品") || item.status.includes("上升") ? "positive" : "neutral"}`}>{item.status}</span></td>
                  <td>{item.direction}</td>
                  <td>{item.popularity}</td>
                  <td>{item.conversion}</td>
                </tr>
              ))}
              {visibleProducts.length === 0 && <tr><td colSpan={9} className="empty">当前条件下没有代表记录，请切换至“全品类”或清空搜索。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        <span>数据源：第30周天猫重点品类市场竞品周报 · 含天猫与淘宝</span>
        <span>口径：排名 1 最强，100 最弱；品牌趋势为入榜商品数</span>
      </footer>
    </main>
  );
}
