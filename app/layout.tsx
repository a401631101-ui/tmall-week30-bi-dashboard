import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "第30周天猫重点品类市场竞品看板",
  description: "完整呈现21个工作表、38,700行源数据，以及品牌、单品与市场异动归纳分析。",
  metadataBase: new URL("https://tmall-week30-bi.a401631101.chatgpt.site"),
  openGraph: {
    title: "第30周天猫重点品类市场竞品看板",
    description: "21个工作表 · 38,700行源数据 · 品牌 / 单品 / 异动",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "第30周天猫重点品类市场竞品看板" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "第30周天猫重点品类市场竞品看板",
    description: "21个工作表 · 38,700行源数据 · 品牌 / 单品 / 异动",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
