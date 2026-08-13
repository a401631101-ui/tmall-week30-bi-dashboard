"use client";

import { useState } from "react";
import { CategoryDashboard } from "./CategoryDashboard";
import { DataExplorer } from "./DataExplorer";
import { VisualDashboard } from "./VisualDashboard";

const categories = [
  "美缝/勾缝剂", "防水涂料", "玻璃胶", "地漏", "地坪漆", "水性木器漆", "艺术漆", "乳胶漆",
  "瓷砖胶", "毛巾架", "角阀", "面盆龙头", "恒温花洒套装", "厨房龙头", "水槽套餐",
];

export function DashboardShell() {
  const [view, setView] = useState("经营总览");
  return (
    <div className="app-shell">
      <aside className="left-nav">
        <div className="tmall-brand"><div>TM</div><span><strong>天猫市场洞察</strong><small>WEEK 30 · BI</small></span></div>
        <p className="nav-label">核心看板</p>
        <button className={view === "经营总览" ? "active" : ""} onClick={() => setView("经营总览")}><i>⌂</i><span>经营总览</span></button>
        <button className={view === "完整数据" ? "active" : ""} onClick={() => setView("完整数据")}><i>▦</i><span>完整数据</span></button>
        <p className="nav-label">分析品类</p>
        <div className="category-nav">
          {categories.map((category, index) => <button key={category} className={view === category ? "active" : ""} onClick={() => setView(category)}><i>{String(index + 1).padStart(2, "0")}</i><span>{category}</span></button>)}
        </div>
        <div className="nav-foot"><span>报告周期</span><strong>07.20 — 07.26</strong><small>数据包含天猫与淘宝</small></div>
      </aside>
      <section className="right-stage">
        <header className="stage-head">
          <div><span>TMALL CATEGORY INTELLIGENCE</span><h1>{view === "经营总览" ? "东方雨虹天猫重点品类驾驶舱" : view === "完整数据" ? "完整数据查询中心" : `${view} · 市场分析`}</h1></div>
          <div className="head-kpis">{view === "经营总览" ? <><span><b>7</b> 雨虹覆盖品类</span><span><b>6</b> Top10席位</span><span><b>48</b> Top100席位</span></> : <><span><b>东方雨虹</b> 我方品牌</span><span><b>W32</b> 本周表现</span></>}</div>
        </header>
        <main className="stage-content">
          {view === "经营总览" && <VisualDashboard />}
          {view === "完整数据" && <DataExplorer />}
          {categories.includes(view) && <CategoryDashboard category={view} />}
        </main>
      </section>
    </div>
  );
}
