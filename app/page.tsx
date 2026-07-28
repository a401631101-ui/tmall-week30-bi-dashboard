"use client";

import { useState } from "react";
import { DataExplorer } from "./DataExplorer";
import { VisualDashboard } from "./VisualDashboard";
import { BrandStrengthBoard } from "./components/BrandStrengthBoard";
import { AnomalyPanel } from "./components/AnomalyPanel";
import { Top10ProductsTable } from "./components/Top10ProductsTable";
import { CategoryDeepDive } from "./components/CategoryDeepDive";

const CATEGORIES = [
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

export default function Home() {
  const [category, setCategory] = useState("全品类");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <main>
      {/* Header */}
      <header className="topbar">
        <div className="brand-mark">TM</div>
        <div>
          <p className="eyebrow">MARKET INTELLIGENCE · WEEK 30</p>
          <h1>天猫重点品类市场竞品看板</h1>
        </div>
        <nav style={{ display: "flex", gap: 16, marginLeft: 24 }}>
          <a href="#overview" style={{ color: "var(--muted)", fontSize: 12, textDecoration: "none" }}>经营驾驶舱</a>
          <a href="#detail" style={{ color: "var(--muted)", fontSize: 12, textDecoration: "none" }}>品牌与单品</a>
          <a href="#data-center" style={{ color: "var(--muted)", fontSize: 12, textDecoration: "none" }}>完整数据</a>
        </nav>
        <div className="period">
          <span>数据周期</span>
          <strong>2026.07.20 — 07.26</strong>
        </div>
      </header>

      {/* Visual Cockpit */}
      <div id="overview">
        <VisualDashboard />
      </div>

      {/* Control Bar + Detailed Sections */}
      <div id="detail">
        <section className="controlbar" aria-label="看板筛选" style={{ marginTop: 20 }}>
          <label>
            <span>分析品类</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </label>
          <div className="scope-note">
            <span className="live-dot" />
            数据范围包含天猫与淘宝 · 最近三周对比
          </div>
          <label className="search">
            <span>搜索</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="品牌 / 商品ID / 细分方向"
            />
          </label>
        </section>

        {/* Main Dashboard: Brand Board + Anomaly Panel */}
        <section className="dashboard-grid">
          <BrandStrengthBoard />
          <AnomalyPanel category={category} />
        </section>

        {/* Top10 Products Table */}
        <Top10ProductsTable category={category} searchQuery={searchQuery} />

        {/* Category Deep Dive (only when specific category selected) */}
        {category !== "全品类" && <CategoryDeepDive category={category} />}
      </div>

      {/* Raw Data Explorer */}
      <DataExplorer />

      {/* Footer */}
      <footer>
        <span>数据源：第30周天猫重点品类市场竞品周报 · 含天猫与淘宝</span>
        <span>口径：排名 1 最强，100 最弱；品牌趋势为入榜商品数</span>
      </footer>
    </main>
  );
}
