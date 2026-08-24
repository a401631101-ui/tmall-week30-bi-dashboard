"use client";

import { loadProductImages } from "../data/loaders";
import { useAsync } from "../hooks";
import { isYuhongBrand } from "../data/schema";
import { Badge, Track } from "./ui";

const DELISTED_PRODUCT_IDS = new Set(["1073031241072"]);

export interface ProductInsight {
  productId: string;
  name: string;
  brand: string;
  category: string;
  direction?: string;
  rank?: number | null;
  track?: (number | null)[];
  status?: string;
  visitors?: string;
  conversion?: string;
  judgment?: string;
  action?: string;
  priority?: string;
}

export function ProductInsightCard({ product, compact = false }: { product: ProductInsight; compact?: boolean }) {
  const { data: images } = useAsync(loadProductImages);
  const mine = isYuhongBrand(product.brand);
  const rank = product.rank ?? product.track?.at(-1) ?? null;
  const top3 = rank != null && rank <= 3;
  const link = `https://detail.tmall.com/item.htm?id=${encodeURIComponent(product.productId)}`;
  const delisted = DELISTED_PRODUCT_IDS.has(product.productId) && !images?.[product.productId];
  return (
    <article className={`overflow-hidden rounded-xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${mine ? "border-2 border-rose-500 bg-rose-50/30" : top3 ? "border-2 border-amber-400" : "border-slate-200"}`}>
      <a href={link} target="_blank" rel="noreferrer" className={`relative flex items-center justify-center bg-white p-2 ${compact ? "h-44" : "h-72"}`}>
        {images?.[product.productId] ? <>
          {/* 商品图索引包含外部动态域名，保留原生 img 以兼容离线 JSON 数据源。 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[product.productId]} alt={product.name} className="h-full w-full object-contain" />
        </> : <div className={`flex h-[90%] w-[90%] flex-col items-center justify-center rounded-xl border-2 border-dashed text-xs font-semibold ${delisted ? "border-slate-300 bg-slate-100 text-slate-600" : "border-rose-200 bg-rose-50 text-rose-500"}`}><span className="text-3xl">{delisted ? "×" : "▧"}</span>{delisted ? "产品已下架" : "暂无商品主图"}</div>}
        {rank != null && <span className={`absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-lg rounded-tr-2xl text-sm font-black text-white shadow ${top3 ? "bg-amber-500" : "bg-rose-600"}`}>{rank}</span>}
        {(delisted || product.status) && <span className={`absolute right-2 top-2 rounded-full border-2 px-3 py-1.5 text-sm font-black shadow-sm ${delisted ? "border-slate-400 bg-slate-100 text-slate-700" : product.status?.includes("下降") || product.status?.includes("跌出") || product.status?.startsWith("↓") ? "border-green-300 bg-green-50 text-green-700" : "border-rose-300 bg-rose-50 text-rose-700"}`}>{delisted ? "产品已下架" : product.status}</span>}
      </a>
      <div className="p-3">
        <div className="flex items-center gap-2 text-sm font-black text-blue-700">{product.brand}{mine && <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[11px] text-white">雨虹</span>}</div>
        <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">{product.name}</p>
        <div className="mt-2 font-mono text-[11px] font-semibold text-blue-600">ID {product.productId}</div>
        <div className="mt-2 flex flex-wrap gap-1"><Badge tone="neutral">{product.category}</Badge>{product.direction && <Badge tone="segment">{product.direction}</Badge>}{product.priority && <Badge tone="risk">{product.priority}级</Badge>}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500">
          <span>排名轨迹<br/><strong className="text-slate-800"><Track track={product.track ?? []} /></strong></span>
          <span>搜索人气<br/><strong className="text-slate-800">{product.visitors || "—"}</strong></span>
          <span>转化表现<br/><strong className="text-slate-800">{product.conversion || "—"}</strong></span>
          <span>本周排名<br/><strong className="text-slate-800">{rank ?? "未入榜"}</strong></span>
        </div>
        {(product.judgment || product.action) && <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px] leading-5"><p><b className="text-slate-700">判断：</b><span className="text-slate-600">{product.judgment || "—"}</span></p><p><b className="text-rose-700">行动：</b><span className="text-slate-600">{product.action || "持续跟踪排名、搜索人气和转化变化。"}</span></p></div>}
      </div>
      <footer className="flex justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400"><span>{delisted ? "商品链接已失效" : "点击主图查看详情"}</span>{delisted ? <span className="font-semibold text-slate-500">产品已下架</span> : <a href={link} target="_blank" rel="noreferrer" className="font-semibold text-rose-600">天猫详情 →</a>}</footer>
    </article>
  );
}
