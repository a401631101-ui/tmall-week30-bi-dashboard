"use client";

// 通用小组件（无图表库，SVG 手绘）——统一视觉语言 §10
import type { ReactNode } from "react";
import type { Tone } from "../data/metrics";

export const TONE_HEX: Record<Tone, string> = {
  up: "#e11d48", // 红=增长/上升/机会
  down: "#16a34a", // 绿=下降/收缩
  risk: "#ea580c", // 橙=风险/观察
  neutral: "#2563eb", // 蓝=市场/中性
  segment: "#7c3aed", // 紫=细分方向
  flat: "#9ca3af", // 灰=持平
};

// ── 面板 ─────────────────────────────────────────────────────────────────────
export function Panel({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_6px_22px_rgba(15,23,42,.07)]">
      {(title || right) && (
        <header className="relative flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div className="flex-1 text-center">
            {title && <h3 className="text-lg font-black text-slate-950">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm font-semibold text-slate-600">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

// ── KPI 卡 ───────────────────────────────────────────────────────────────────
export function Kpi({
  label,
  value,
  delta,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  tone?: Tone;
  sub?: string;
}) {
  const color = TONE_HEX[tone];
  return (
    <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      {delta != null && (
        <div className={`mt-0.5 text-xs font-medium ${delta > 0 ? "text-rose-600" : delta < 0 ? "text-green-600" : "text-slate-400"}`}>
          {delta > 0 ? "▲" : delta < 0 ? "▼" : "◆"} {delta > 0 ? "+" : ""}
          {delta}
        </div>
      )}
      {sub && <div className="mt-1 text-[11px] font-medium text-slate-600">{sub}</div>}
    </div>
  );
}

// ── 语义徽章 ─────────────────────────────────────────────────────────────────
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const color = TONE_HEX[tone];
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color, backgroundColor: `${color}14`, border: `1px solid ${color}33` }}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, Tone> = { S: "up", A: "risk", B: "neutral", C: "flat" };
  return <Badge tone={map[priority] ?? "flat"}>{priority}</Badge>;
}

// ── 排名轨迹（产品卡内联） ──────────────────────────────────────────────────
export function Track({ track }: { track: (number | null)[] }) {
  const cells = (track || []).map((r, i) => {
    const prev = i > 0 ? track[i - 1] : null;
    const tone: Tone =
      r == null ? "flat" : prev == null ? "neutral" : r < prev ? "up" : r > prev ? "down" : "flat";
    return (
      <span key={i} className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums">
        <span style={{ color: TONE_HEX[tone] }}>{r == null ? "—" : r}</span>
        {i < track.length - 1 && <span className="text-slate-300">›</span>}
      </span>
    );
  });
  return <span className="inline-flex items-center gap-0.5">{cells}</span>;
}

// ── 简易折线图（多序列，周为 x 轴） ─────────────────────────────────────────
export interface Series {
  name: string;
  color: string;
  values: (number | null)[]; // 与 weeks 等长
  highlight?: boolean; // 加粗（东方雨虹）
}

export function LineChart({
  weeks,
  series,
  sparseWeeks = new Set<number>(),
  height = 180,
  yLabel = "席位",
  showValues = false,
  showAllWeeks = false,
}: {
  weeks: number[];
  series: Series[];
  sparseWeeks?: Set<number>;
  height?: number;
  yLabel?: string;
  showValues?: boolean;
  showAllWeeks?: boolean;
}) {
  const W = 760;
  const H = height;
  const PAD_L = 54;
  const PAD_R = 28;
  const PAD_T = showValues ? 22 : 12;
  const PAD_B = 30;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const allVals = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const maxV = Math.max(1, ...allVals);
  const minW = Math.min(...weeks);
  const maxW = Math.max(...weeks);

  const x = (w: number) => PAD_L + ((w - minW) / Math.max(1, maxW - minW)) * innerW;
  const y = (v: number | null) => (v == null ? PAD_T + innerH : PAD_T + innerH - (v / maxV) * innerH);

  const yTicks = [0, Math.round(maxV / 2), maxV].filter((v, i, a) => a.indexOf(v) === i);
  const valueLabelY = new Map<string, number>();
  if (showValues) {
    weeks.forEach((_, weekIndex) => {
      const labels = series
        .map((s, seriesIndex) => ({ seriesIndex, value: s.values[weekIndex] }))
        .filter((item): item is { seriesIndex: number; value: number } => item.value != null)
        .map((item) => ({ ...item, target: y(item.value) - 7 }))
        .sort((a, b) => a.target - b.target);
      // 11px labels render at roughly 13–14px line height in Chromium.
      // Keep a 16px lane between same-week labels so equal/near-equal series
      // remain readable instead of visually merging.
      const minGap = 16;
      labels.forEach((item, index) => {
        const previous = index ? valueLabelY.get(`${labels[index - 1].seriesIndex}-${weekIndex}`) : undefined;
        const placed = previous == null ? item.target : Math.max(item.target, previous + minGap);
        valueLabelY.set(`${item.seriesIndex}-${weekIndex}`, Math.min(PAD_T + innerH - 5, placed));
      });
    });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel + "趋势"}>
      {weeks
        .filter((w) => sparseWeeks.has(w))
        .map((w) => (
          <rect key={w} x={x(w) - 3} y={PAD_T} width={Math.max(2, innerW / Math.max(1, maxW - minW))} height={innerH} fill="#f1f5f9" />
        ))}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD_L} y1={y(v)} x2={W - PAD_R} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
          <text x={PAD_L - 7} y={y(v) + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#64748b">{v}</text>
        </g>
      ))}
      <line x1={PAD_L} y1={PAD_T + innerH} x2={W - PAD_R} y2={PAD_T + innerH} stroke="#cbd5e1" strokeWidth={1} />
      {series.map((s) => {
        const pts = weeks
          .map((w, i) => ({ w, v: s.values[i] }))
          .filter((p) => p.v != null)
          .map((p) => `${x(p.w)},${y(p.v)}`)
          .join(" ");
        return (
          <g key={s.name}>
            <polyline
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={s.highlight ? 2.5 : 1.5}
              strokeOpacity={s.highlight ? 1 : 0.85}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) =>
              v == null ? null : (
                <circle key={i} cx={x(weeks[i])} cy={y(v)} r={s.highlight ? 2.8 : 1.8} fill={s.color}><title>{s.name} · 第{weeks[i]}周：{Math.round(v)}</title></circle>
              ),
            )}
            {showValues && s.values.map((v, i) => {
              if (v == null) return null;
              const crowded = series.length > 3;
              const shouldLabel = crowded
                ? (s.highlight ? (i % 2 === 0 || i === weeks.length - 1) : (i === 0 || i === weeks.length - 1))
                : (weeks.length <= 10 || i === 0 || i === weeks.length - 1 || i % 4 === 0 || sparseWeeks.has(weeks[i]));
              if (!shouldLabel) return null;
              const seriesIndex = series.indexOf(s);
              return <text key={`v-${i}`} x={x(weeks[i])} y={valueLabelY.get(`${seriesIndex}-${i}`) ?? y(v) - 7} textAnchor="middle" fontSize={11} fontWeight={s.highlight ? 800 : 700} fill={s.color} stroke="white" strokeWidth={3} paintOrder="stroke">{Math.round(v)}</text>;
            })}
          </g>
        );
      })}
      {weeks
        .filter((w, i) => showAllWeeks || weeks.length <= 10 || i % 4 === 0 || sparseWeeks.has(w))
        .map((w) => (
          <text key={w} x={x(w)} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={sparseWeeks.has(w) ? "#d97706" : "#64748b"}>
            第{w}周
          </text>
        ))}
    </svg>
  );
}

export function DonutChart({ items, centerLabel, onSelect }: { items: { name: string; value: number; color: string }[]; centerLabel: string; onSelect?: (name: string) => void }) {
  const total = items.reduce((n, x) => n + x.value, 0);
  const stops = items.map((it, index) => {
    const startValue = items.slice(0, index).reduce((sum, item) => sum + item.value, 0);
    const endValue = startValue + it.value;
    const start = total ? startValue / total * 100 : 0;
    const end = total ? endValue / total * 100 : 0;
    return `${it.color} ${start}% ${end}%`;
  }).join(",");
  return <div className="grid grid-cols-[150px_1fr] items-center gap-4"><button className="relative h-36 w-36 rounded-full" style={{background:`conic-gradient(${stops || "#e2e8f0 0 100%"})`}}><span className="absolute inset-7 grid place-items-center rounded-full bg-white text-center text-xs font-bold text-slate-700">{centerLabel}<b className="block text-xl text-slate-950">{total}</b></span></button><div className="space-y-2">{items.map((it) => <button key={it.name} onClick={() => onSelect?.(it.name)} className="grid w-full grid-cols-[10px_1fr_auto] items-center gap-2 text-left text-xs"><i className="h-2.5 w-2.5 rounded-full" style={{background:it.color}}/><span className="truncate font-semibold text-slate-700">{it.name}</span><b>{it.value} · {total ? (it.value/total*100).toFixed(1) : "0.0"}%</b></button>)}</div></div>;
}

// ── 图例 ─────────────────────────────────────────────────────────────────────
export function Legend({ items }: { items: { name: string; color: string; highlight?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <span className="inline-block rounded" style={{ background: it.color, width: 16, height: it.highlight ? 3 : 2 }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

// ── 加载/错误占位 ───────────────────────────────────────────────────────────
export function Loading({ text = "加载中…" }: { text?: string }) {
  return <div className="flex items-center justify-center py-16 text-sm text-slate-400">{text}</div>;
}

export function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      数据加载失败：{msg}
    </div>
  );
}
