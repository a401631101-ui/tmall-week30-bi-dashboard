"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

type CellValue = string | number | boolean | null;
type ManifestItem = {
  index: number;
  sheet: string;
  address: string | null;
  rows: number;
  cols: number;
  file: string;
};
type SheetPayload = ManifestItem & { values: CellValue[][] };
type Analytics = {
  totalSourceRows: number;
  totalSheets: number;
  latestPeriod: string;
  shopTypesAll: { name: string; value: number }[];
  shopTypesLatest: { name: string; value: number }[];
  periods: { name: string; value: number }[];
};

function columnLetter(index: number) {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value--;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function displayValue(value: CellValue) {
  if (value === null || value === "") return "";
  return String(value);
}

export function DataExplorer() {
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedFile, setSelectedFile] = useState("/data/03.json");
  const [payload, setPayload] = useState<SheetPayload | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [expandCells, setExpandCells] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/data/manifest.json").then((response) => response.json()),
      fetch("/data/analytics.json").then((response) => response.json()),
    ]).then(([manifestData, analyticsData]) => {
      setManifest(manifestData);
      setAnalytics(analyticsData);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setQuery("");
    fetch(selectedFile)
      .then((response) => response.json())
      .then((data) => setPayload(data))
      .finally(() => setLoading(false));
  }, [selectedFile]);

  const filteredRows = useMemo(() => {
    if (!payload) return [];
    const indexed = payload.values.map((row, index) => ({ row, index }));
    if (!deferredQuery) return indexed;
    return indexed.filter(({ row }) =>
      row.some((cell) => displayValue(cell).toLowerCase().includes(deferredQuery)),
    );
  }, [payload, deferredQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const columnCount = payload?.cols ?? 0;

  function downloadCsv() {
    if (!payload) return;
    const rows = filteredRows.map(({ row }) =>
      row.map((cell) => {
        const text = displayValue(cell).replaceAll('"', '""');
        return `"${text}"`;
      }).join(","),
    );
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.sheet}${deferredQuery ? "_筛选结果" : "_完整数据"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="data-center" id="data-center">
      <div className="data-title">
        <div>
          <p className="eyebrow">COMPLETE WORKBOOK DATA</p>
          <h2>完整数据中心</h2>
          <p>21个工作表全部导入，支持逐表查看、全文检索、分页浏览和CSV下载。</p>
        </div>
        {analytics && (
          <div className="coverage">
            <div><strong>{analytics.totalSheets}</strong><span>工作表</span></div>
            <div><strong>{analytics.totalSourceRows.toLocaleString()}</strong><span>源数据行</span></div>
            <div><strong>{analytics.periods.length}</strong><span>数据周期</span></div>
            <div><strong>100%</strong><span>表格覆盖</span></div>
          </div>
        )}
      </div>

      {analytics && (
        <div className="source-analysis">
          <div>
            <span>全周期平台构成</span>
            <strong>天猫 {analytics.shopTypesAll.find((item) => item.name === "天猫")?.value.toLocaleString()} · 淘宝 {analytics.shopTypesAll.find((item) => item.name === "淘宝")?.value.toLocaleString()}</strong>
          </div>
          <div className="stacked-bar" aria-label="全周期平台数据构成">
            <i style={{ width: `${(analytics.shopTypesAll[0].value / analytics.totalSourceRows) * 100}%` }} />
            <b />
          </div>
          <div>
            <span>第30周平台构成</span>
            <strong>天猫 1,140 · 淘宝 360</strong>
          </div>
          <div>
            <span>分析说明</span>
            <strong>未剔除淘宝数据，平台合并观察市场竞争</strong>
          </div>
        </div>
      )}

      <div className="explorer-layout">
        <aside className="sheet-list" aria-label="工作表列表">
          <p>工作表目录</p>
          {manifest.map((item) => (
            <button
              key={item.file}
              className={selectedFile === item.file ? "active" : ""}
              onClick={() => setSelectedFile(item.file)}
            >
              <span>{String(item.index + 1).padStart(2, "0")}</span>
              <div><strong>{item.sheet}</strong><small>{item.rows.toLocaleString()} 行 × {item.cols} 列</small></div>
            </button>
          ))}
        </aside>

        <div className="data-workspace">
          <div className="data-toolbar">
            <div>
              <span>当前工作表</span>
              <strong>{payload?.sheet ?? "读取中…"}</strong>
              <small>{payload?.address ?? ""}</small>
            </div>
            <label>
              <span>全文检索</span>
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                placeholder="搜索品牌、商品ID、品类、判断或任意单元格"
              />
            </label>
            <label>
              <span>每页行数</span>
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>
            <button className={`cell-view-toggle ${expandCells ? "active" : ""}`} onClick={() => setExpandCells((value) => !value)}>
              {expandCells ? "紧凑显示" : "展开全文"}
            </button>
            <button className="download" onClick={downloadCsv} disabled={!payload}>下载当前数据</button>
          </div>

          <div className="result-meta">
            <span>共 {payload?.rows.toLocaleString() ?? 0} 行</span>
            <span>当前结果 {filteredRows.length.toLocaleString()} 行</span>
            <span>第 {page} / {pageCount} 页</span>
            {deferredQuery && <b>筛选：{query}</b>}
          </div>

          <div className={`raw-grid-wrap ${loading ? "loading" : ""} ${expandCells ? "expanded" : ""}`}>
            {loading ? (
              <div className="data-loading">正在读取完整工作表…</div>
            ) : (
              <table className="raw-grid">
                <thead>
                  <tr>
                    <th className="row-number">#</th>
                    {Array.from({ length: columnCount }, (_, index) => <th key={index}>{columnLetter(index)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ row, index }) => (
                    <tr key={index}>
                      <th className="row-number">{index + 1}</th>
                      {Array.from({ length: columnCount }, (_, cellIndex) => (
                        <td key={cellIndex} title={displayValue(row[cellIndex] ?? null)}>
                          {displayValue(row[cellIndex] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pagination">
            <button onClick={() => setPage(1)} disabled={page === 1}>首页</button>
            <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>上一页</button>
            <span>{page} / {pageCount}</span>
            <button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>下一页</button>
            <button onClick={() => setPage(pageCount)} disabled={page === pageCount}>末页</button>
          </div>
        </div>
      </div>
    </section>
  );
}
