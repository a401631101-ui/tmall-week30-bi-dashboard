import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 纯前端启动配置 —— 绕过 vinext/Cloudflare RSC（本环境其 workerd inspector 死锁、
// cloudflared 隧道退出，冷启动还要编译 6–7 分钟），改用普通 Vite 秒级启动客户端渲染看板。
// 数据仍从 public/data/*.json 读取，应用逻辑（app/ 下所有组件）零改动。
export default defineConfig({
  cacheDir: ".vite-cache",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
