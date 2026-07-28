"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Analytics = {
  totalSourceRows: number;
  shopTypesAll: { name: string; value: number }[];
  shopTypesLatest: { name: string; value: number }[];
  periods: { name: string; value: number }[];
};

const categoryMap = [
  ["美缝/勾缝剂", 94, "头部换位", "hot"],
  ["防水涂料", 90, "爆品稳定", "hot"],
  ["乳胶漆", 86, "竞争加剧", "hot"],
  ["玻璃胶", 78, "腰部收缩", "warn"],
  ["角阀", 76, "品牌收缩", "warn"],
  ["地漏", 73, "连续收缩", "warn"],
  ["厨房龙头", 72, "单品冲榜", "good"],
  ["水槽套餐", 70, "矩阵扩张", "good"],
  ["恒温花洒", 68, "矩阵扩张", "good"],
  ["毛巾架", 66, "头部增强", "good"],
  ["面盆龙头", 62, "腰部收缩", "warn"],
  ["瓷砖胶", 58, "稳定观察", "stable"],
  ["地坪漆", 55, "单品波动", "stable"],
  ["艺术漆", 51, "分散竞争", "stable"],
  ["水性木器漆", 46, "长尾市场", "stable"],
] as const;

const brandMetrics = [
  { name: "九牧", top10: 20, top30: 38, top100: 105, delta: -9, state: "预警" },
  { name: "潜水艇", top10: 16, top30: 47, top100: 112, delta: -8, state: "预警" },
  { name: "立邦", top10: 6, top30: 29, top100: 64, delta: 4, state: "扩张" },
  { name: "东方雨虹", top10: 6, top30: 17, top100: 48, delta: 2, state: "扩张" },
  { name: "三棵树", top10: 13, top30: 22, top100: 47, delta: 0, state: "稳健" },
  { name: "瓦克", top10: 5, top30: 11, top100: 18, delta: -1, state: "收缩" },
];

const productTracks = [
  { rank: 1, name: "东方雨虹美缝剂", category: "美缝", values: [2, 3, 1], state: "绝对爆品" },
  { rank: 1, name: "沃特浦防水涂料", category: "防水", values: [1, 1, 1], state: "绝对爆品" },
  { rank: 3, name: "房屋医生美缝剂", category: "美缝", values: [6, 4, 3], state: "连续上升" },
  { rank: 1, name: "九牧抽拉厨房龙头", category: "厨卫", values: [4, 3, 1], state: "连续上升" },
  { rank: 8, name: "九牧304水槽", category: "水槽", values: [14, 11, 8], state: "冲入Top10" },
];

function PeriodChart({ analytics }: { analytics: Analytics | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analytics) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = 210;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const values = analytics.periods.map((item) => item.value);
    const max = Math.max(...values);
    const left = 14;
    const right = width - 14;
    const top = 18;
    const bottom = 175;
    ctx.strokeStyle = "#243842";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    for (let i = 0; i < 4; i++) {
      const y = top + ((bottom - top) / 3) * i;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const points = values.map((value, index) => ({
      x: left + ((right - left) * index) / Math.max(1, values.length - 1),
      y: bottom - (value / max) * (bottom - top),
    }));
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, "rgba(255,78,88,.34)");
    gradient.addColorStop(1, "rgba(255,78,88,0)");
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = "#ff4e58";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    points.slice(-3).forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#0d1a20";
      ctx.fill();
      ctx.strokeStyle = "#ff4e58";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.fillStyle = "#8fa0a8";
    ctx.font = '11px "Microsoft YaHei"';
    ctx.fillText("第1周", left, 201);
    ctx.textAlign = "right";
    ctx.fillText("第30周", right, 201);
  }, [analytics]);
  return <canvas ref={canvasRef} aria-label="各周数据覆盖趋势图" />;
}

export function VisualDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [brandMetric, setBrandMetric] = useState<"top10" | "top30" | "top100">("top100");
  const [anomalyCounts, setAnomalyCounts] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    fetch("/data/analytics.json").then((response) => response.json()).then(setAnalytics);
    fetch("/data/03.json").then((response) => response.json()).then((data) => {
      const counts = new Map<string, number>();
      data.values.slice(2).forEach((row: unknown[]) => {
        const type = String(row[0] ?? "");
        if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
      });
      setAnomalyCounts([...counts.entries()].map(([name, value]) => ({ name, value })));
    });
  }, []);

  const platform = useMemo(() => {
    if (!analytics) return { tmall: 0, taobao: 0, tmallRate: 0 };
    const tmall = analytics.shopTypesAll.find((item) => item.name === "天猫")?.value ?? 0;
    const taobao = analytics.shopTypesAll.find((item) => item.name === "淘宝")?.value ?? 0;
    return { tmall, taobao, tmallRate: Math.round((tmall / (tmall + taobao)) * 100) };
  }, [analytics]);

  const brandMax = Math.max(...brandMetrics.map((item) => item[brandMetric]));
  const anomalyMax = Math.max(...anomalyCounts.map((item) => item.value), 1);

  return (
    <section className="cockpit">
      <div className="insight-banner">
        <div><span>W30 核心结论</span><strong>头部稳定，品牌矩阵分化，厨卫单品换位加速</strong></div>
        <p>本周15个品类Top100保持完整覆盖。汉斯格雅、卡贝、悍高出现矩阵扩张；潜水艇、九牧部分品类和瓦克腰部占位收缩。</p>
        <a href="#data-center">查看全部明细 →</a>
      </div>

      <div className="visual-kpis">
        <article><i>01</i><span>市场覆盖</span><strong>15</strong><small>重点品类</small><b className="kpi-spark s1" /></article>
        <article><i>02</i><span>本周商品池</span><strong>1,500</strong><small>每类目Top100</small><b className="kpi-spark s2" /></article>
        <article><i>03</i><span>跨品类品牌</span><strong>567</strong><small>竞争品牌池</small><b className="kpi-spark s3" /></article>
        <article><i>04</i><span>头部单品</span><strong>150</strong><small>全品类Top10</small><b className="kpi-spark s4" /></article>
        <article className="risk-kpi"><i>05</i><span>异动记录</span><strong>1,249</strong><small>机会与风险</small><b className="kpi-spark s5" /></article>
      </div>

      <div className="visual-grid">
        <article className="viz-card period-card">
          <div className="viz-title"><div><span>市场数据脉搏</span><h2>周度覆盖趋势</h2></div><em>32个周期 · 全量历史</em></div>
          <PeriodChart analytics={analytics} />
          <div className="chart-foot"><span><i className="dot red" /> 每周样本量</span><strong>最新三周稳定在 1,500 条</strong></div>
        </article>

        <article className="viz-card platform-card">
          <div className="viz-title"><div><span>平台构成</span><h2>样本来源占比</h2></div></div>
          <div className="donut-wrap">
            <div className="donut" style={{ "--rate": `${platform.tmallRate * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{platform.tmallRate}%</strong><span>天猫</span></div>
            </div>
            <div className="legend-block">
              <div><i className="dot red" /><span>天猫</span><strong>{platform.tmall.toLocaleString()}</strong></div>
              <div><i className="dot dark" /><span>淘宝</span><strong>{platform.taobao.toLocaleString()}</strong></div>
            </div>
          </div>
          <p className="viz-note">平台数据合并分析，未过滤淘宝样本。</p>
        </article>

        <article className="viz-card category-card">
          <div className="viz-title"><div><span>竞争热力</span><h2>15品类市场态势</h2></div><em>颜色代表经营判断</em></div>
          <div className="heatmap">
            {categoryMap.map(([name, score, label, tone]) => (
              <div key={name} className={`heat-cell ${tone}`} style={{ "--heat": score / 100 } as React.CSSProperties}>
                <strong>{name}</strong><span>{label}</span><b>{score}</b>
              </div>
            ))}
          </div>
          <div className="heat-legend"><span><i className="dot red" /> 高竞争</span><span><i className="dot green" /> 扩张机会</span><span><i className="dot amber" /> 收缩预警</span></div>
        </article>

        <article className="viz-card brand-chart-card">
          <div className="viz-title">
            <div><span>品牌矩阵</span><h2>核心品牌入榜强度</h2></div>
            <div className="metric-tabs">
              {(["top10", "top30", "top100"] as const).map((metric) => <button key={metric} className={brandMetric === metric ? "active" : ""} onClick={() => setBrandMetric(metric)}>{metric.toUpperCase()}</button>)}
            </div>
          </div>
          <div className="brand-bars">
            {brandMetrics.map((brand, index) => (
              <div className="brand-bar-row" key={brand.name}>
                <span className="brand-index">{String(index + 1).padStart(2, "0")}</span>
                <strong>{brand.name}</strong>
                <i><b className={brand.delta < 0 ? "bar-risk" : ""} style={{ width: `${(brand[brandMetric] / brandMax) * 100}%` }} /></i>
                <em>{brand[brandMetric]}</em>
                <small className={brand.delta < 0 ? "negative" : "positive-text"}>{brand.delta > 0 ? `+${brand.delta}` : brand.delta}</small>
              </div>
            ))}
          </div>
          <p className="viz-note">趋势为品牌入榜商品数量，不是品牌排名。负值代表Top100较前期收缩。</p>
        </article>

        <article className="viz-card anomaly-card">
          <div className="viz-title"><div><span>变化雷达</span><h2>异动类型分布</h2></div><em>共1,249条</em></div>
          <div className="anomaly-bars">
            {anomalyCounts.map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <i><b style={{ width: `${(item.value / anomalyMax) * 100}%` }} /></i>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="viz-card product-card">
          <div className="viz-title"><div><span>单品赛道</span><h2>强势商品三周轨迹</h2></div><em>排名越低越强</em></div>
          <div className="product-visual-list">
            {productTracks.map((item) => (
              <div key={item.name}>
                <span className="track-rank">{item.rank}</span>
                <div className="track-name"><strong>{item.name}</strong><small>{item.category} · {item.state}</small></div>
                <div className="rank-track">
                  {item.values.map((value, index) => <i key={index} style={{ height: `${Math.max(14, 100 - value * 5)}%` }}><b>{value}</b></i>)}
                </div>
                <strong className="track-arrow">{item.values[2] <= item.values[0] ? "↗" : "↘"}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
