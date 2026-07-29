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
  assert.match(html, /id="weekFilter"/);
  assert.match(html, /第28周 · 07\.06—07\.12/);
  assert.match(html, /function handleWeekFilter/);
  assert.match(html, /function weekV/);
  assert.match(html, /rank:weekRank\(p\.track,p\.rank\)/);
  assert.match(html, /onchange="handleHeaderCatFilter\(\)"/);
  assert.match(html, /selected==='全部'\?CATS:\[selected\]/);
  assert.match(html, /active\.id==='tab-products'/);
  assert.match(html, /#tab-products \.pimg\{height:400px\}/);
  assert.match(html, /#tab-anomalies \.pimg\{height:400px\}/);
  assert.match(html, /#tab-category \.pimg\{height:400px\}/);
  assert.match(html, /#tab-category \.category-anomalies \.pimg\{height:200px\}/);
  assert.match(html, /#overviewProducts \.pimg,#risingProducts \.pimg\{height:400px\}/);
  assert.match(html, /#tab-anomalies \.pgrid\{grid-template-columns:repeat\(5,1fr\)\}/);
  assert.match(html, /var anomalyMeta=\{\}/);
  assert.match(html, /d\.products\.forEach\(function\(p\)\{p\.category=cat\}\)/);
  assert.match(html, /category:cat,direction:it\.direction\|\|it\.action/);
  assert.match(html, /class="card category-anomalies"/);
  assert.match(html, /#tab-anomalies \.pbody \.pm,#tab-category \.category-anomalies \.pbody \.pm\{flex-direction:column/);
  assert.match(html, /isUp=status\.includes\('↑'\)/);
  assert.match(html, /isDown=status\.includes\('↓'\)/);
  assert.match(html, /\.ps-up\{color:var\(--red\)/);
  assert.match(html, /\.ps-down\{color:var\(--green\)/);
  assert.doesNotMatch(html, /id="nav-gallery"/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net/);

  const images = JSON.parse(imageManifest);
  assert.ok(Object.keys(images).length >= 885);
  assert.ok(Object.values(images).every((value) => value.startsWith("./product-images/")));
  assert.ok(imageFiles.length >= 150);
  assert.ok(echarts.length > 1_000_000);
});
