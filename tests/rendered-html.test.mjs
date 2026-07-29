import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished Tmall dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>第30周天猫重点品类市场竞品看板<\/title>/i);
  assert.match(html, /东方雨虹天猫重点品类驾驶舱/);
  assert.match(html, /经营总览/);
  assert.match(html, /完整数据/);
  assert.match(html, /防水涂料/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("standalone dashboard ships its required local resources", async () => {
  const [html, imageManifest, echarts, imageFiles] = await Promise.all([
    readFile(new URL("../public/bi-dashboard.html", import.meta.url), "utf8"),
    readFile(new URL("../public/product-images.json", import.meta.url), "utf8"),
    readFile(new URL("../public/vendor/echarts.min.js", import.meta.url), "utf8"),
    readdir(new URL("../public/product-images/", import.meta.url)),
  ]);

  assert.match(html, /src="\.\/vendor\/echarts\.min\.js"/);
  assert.match(html, /LJ\('\.\/data\/01\.json'\)/);
  assert.match(html, /LJ\('\.\/product-images\.json'\)/);
  assert.match(html, /function showLoadError/);
  assert.match(html, /品牌周对比/);
  assert.match(html, /id="nav-products"/);
  assert.match(html, /id="headerCatFilter"/);
  assert.match(html, /onchange="handleHeaderCatFilter\(\)"/);
  assert.match(html, /selected==='全部'\?CATS:\[selected\]/);
  assert.match(html, /active\.id==='tab-products'/);
  assert.doesNotMatch(html, /id="nav-gallery"/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net/);

  const images = JSON.parse(imageManifest);
  assert.ok(Object.keys(images).length >= 885);
  assert.ok(Object.values(images).every((value) => value.startsWith("./product-images/")));
  assert.ok(imageFiles.length >= 150);
  assert.ok(echarts.length > 1_000_000);
});
