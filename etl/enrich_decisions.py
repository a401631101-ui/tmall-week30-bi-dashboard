#!/usr/bin/env python3
"""为既有32周事实/周报补齐平台字段与可解释经营结论。"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "public" / "data"
RULE = "decision-rules-v1.0"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def last2(values):
    vals = list(values or [])
    cur = vals[-1] if vals else 0
    prev = vals[-2] if len(vals) > 1 else 0
    return int(cur or 0), int(prev or 0)


def main():
    brand_series = load(DATA / "timeseries" / "brands.json")
    for fact_path in sorted((DATA / "facts").glob("week-*.json")):
        rows = load(fact_path)
        for row in rows:
            shop = str(row.get("shopType") or "")
            row["platform"] = "天猫" if "天猫" in shop else ("淘宝" if "淘宝" in shop else "其他")
        save(fact_path, rows)

    for report_path in sorted((DATA / "reports").glob("week-*.json")):
        report = load(report_path)
        week = int(report.get("meta", {}).get("week", report_path.stem.split("-")[-1]))
        conclusions = []
        mine = [b for b in brand_series if b.get("brand") in {"东方雨虹", "雨虹飞鱼", "雨虹"}]
        def at(b, w):
            return b.get("top100", [])[b["weeks"].index(w)] if w in b.get("weeks", []) else 0
        cur = sum(at(b, week) for b in mine)
        prev = sum(at(b, week - 1) for b in mine)
        changes = []
        for category, block in report.get("categories", {}).items():
            entries = [b for b in block.get("brandTable", []) if b.get("brand") in {"东方雨虹", "雨虹飞鱼", "雨虹"}]
            c = sum(last2(b.get("t100"))[0] for b in entries)
            p = sum(last2(b.get("t100"))[1] for b in entries)
            if c != p:
                changes.append((category, c - p))
        changes.sort(key=lambda x: abs(x[1]), reverse=True)
        affected = [x[0] for x in changes[:3]]
        delta = cur - prev
        conclusions.append({
            "text": f"雨虹品牌群Top100席位{'扩张' if delta > 0 else '收缩' if delta < 0 else '持平'}：{prev}→{cur}，变化{delta:+d}席。",
            "current": cur, "previous": prev, "delta": delta, "affected": affected,
            "ruleVersion": RULE, "priority": "S" if abs(delta) >= 5 else "B",
        })
        anomalies = report.get("anomalies", [])
        mine_risks = [a for a in anomalies if "雨虹" in str(a.get("brand")) and ("下降" in a.get("type", "") or "跌出" in a.get("type", ""))]
        if mine_risks:
            top = sorted(mine_risks, key=lambda a: abs(a.get("delta") or 0), reverse=True)[:3]
            conclusions.append({
                "text": f"发现{len(mine_risks)}条雨虹产品下行信号，优先处理排名变化最大的核心商品。",
                "current": len(mine_risks), "previous": 0, "delta": len(mine_risks),
                "affected": [str(a.get("productId") or a.get("name")) for a in top],
                "ruleVersion": RULE, "priority": "S",
            })
        opportunities = report.get("homepage", {}).get("narratives", {}).get("segmentOpportunities", "")
        if opportunities:
            conclusions.append({
                "text": opportunities, "current": 1, "previous": 0, "delta": 1,
                "affected": affected, "ruleVersion": RULE, "priority": "A",
            })
        report["conclusions"] = conclusions
        save(report_path, report)
    print("已补齐32周平台字段与结构化结论")


if __name__ == "__main__":
    main()
