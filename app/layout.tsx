import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "东方雨虹32周市场经营决策驾驶舱",
  description: "图表化呈现21个工作表、41,700行源数据，以及品牌、单品与市场异动归纳分析。",
  metadataBase: new URL("https://tmall-week30-bi.a401631101.chatgpt.site"),
  openGraph: {
    title: "东方雨虹32周市场经营决策驾驶舱",
    description: "15品类竞争热力 · 品牌矩阵 · 单品轨迹 · 异动雷达",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "东方雨虹32周市场经营决策驾驶舱" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "东方雨虹32周市场经营决策驾驶舱",
    description: "15品类竞争热力 · 品牌矩阵 · 单品轨迹 · 异动雷达",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
