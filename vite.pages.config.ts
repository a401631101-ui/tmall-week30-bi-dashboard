import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "/tmall-week30-bi-dashboard/",
  publicDir: false,
  build: {
    outDir: "dist-pages",
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
