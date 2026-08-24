#!/usr/bin/env python3
"""
时序视图生成：facts/week-*.json → timeseries/{brands,categories,products}.json
用法: python3 etl/timeseries.py
规模口径 = 访客数（分桶取中值求和）；增长 = 周环比；4/8 周用滚动均值（前端按窗口聚合）。
"""
import json
import os
import re

DATA = '/Users/fengna/Documents/Codex/天猫类目bi看板 tmall-week30-bi-dashboard /tmall-week30-bi-dashboard/public/data/'
WEEKS = list(range(1, 33))
YUHONG_TIERS = {'东方雨虹', '雨虹飞鱼', '雨虹'}


def parse_range(s):
    if not s:
        return (0.0, 0.0)
    s = str(s).strip().replace(',', '')
    m = re.match(r'^(.*?)\s*~\s*(.*)$', s)
    if not m:
        return (0.0, 0.0)

    def num(x):
        x = x.strip()
        mult = 1.0
        if '万' in x:
            mult = 10000.0
            x = x.replace('万', '')
        if '亿' in x:
            mult = 1e8
            x = x.replace('亿', '')
        try:
            return float(x) * mult
        except ValueError:
            return 0.0
    return (num(m.group(1)), num(m.group(2)))


def midpoint(s):
    lo, hi = parse_range(s)
    return (lo + hi) / 2.0


def load_facts():
    out = {}
    for w in WEEKS:
        path = os.path.join(DATA, 'facts', f'week-{w:02d}.json')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            out[w] = json.load(f)
    return out


def main():
    facts = load_facts()
    present_weeks = sorted(facts.keys())
    print(f'载入 facts: {len(present_weeks)} 周')

    # ============ brands ============
    brand_ts = {}
    for w in present_weeks:
        week = {}
        for r in facts[w]:
            b = r['brand']
            if not b:
                continue
            d = week.setdefault(b, {'t10': 0, 't30': 0, 't100': 0, 'cats': set()})
            d['t100'] += 1
            if r['rank'] is not None and r['rank'] <= 30:
                d['t30'] += 1
            if r['rank'] is not None and r['rank'] <= 10:
                d['t10'] += 1
            d['cats'].add(r['category'])
        for b, d in week.items():
            ts = brand_ts.setdefault(b, {'brand': b, 'isMine': b in YUHONG_TIERS, 'weeks': [], 'top10': [], 'top30': [], 'top100': [], 'categoryCount': []})
            ts['weeks'].append(w)
            ts['top10'].append(d['t10'])
            ts['top30'].append(d['t30'])
            ts['top100'].append(d['t100'])
            ts['categoryCount'].append(len(d['cats']))

    # 连续增长周数（Top100 环比>0，从最近一周回数；覆盖周有断档则中断）
    for ts in brand_ts.values():
        n = 0
        top100 = ts['top100']
        weeks = ts['weeks']
        for i in range(len(top100) - 1, 0, -1):
            if top100[i] > top100[i - 1] and weeks[i] == weeks[i - 1] + 1:
                n += 1
            else:
                break
        ts['consecutiveGrowthWeeks'] = n
    brands_out = sorted(brand_ts.values(), key=lambda x: (-x['top100'][-1] if x['top100'] else 0, -len(x['weeks'])))

    # ============ categories ============
    # 第一遍：每类目每周边原始聚合（scale/brands/products/top10_brands/yuhong/brand_counts）
    cat_week_raw = {}  # (category, week) -> {scale, brands, products, top10_brands, yuhong, brand_counts}
    for w in present_weeks:
        week = {}
        for r in facts[w]:
            c = r['category']
            d = week.setdefault(c, {'scale': 0.0, 'brands': set(), 'products': set(), 'top10_brands': [], 'yuhong': 0, 'brand_counts': {}})
            d['scale'] += midpoint(r['visitors'])
            if r['brand']:
                d['brands'].add(r['brand'])
                d['brand_counts'][r['brand']] = d['brand_counts'].get(r['brand'], 0) + 1
            if r['productId2']:
                d['products'].add(r['productId2'])
            if r['rank'] is not None and r['rank'] <= 10 and r['brand']:
                d['top10_brands'].append(r['brand'])
            if r['isMine']:
                d['yuhong'] += 1
        for c, d in week.items():
            cat_week_raw[(c, w)] = d

    # 第二遍：组装时序（含周环比 growth、差集 newBrands/newProducts、品牌集中度 brandConcentration）
    cat_ts = {}
    for (c, _w), _d in cat_week_raw.items():
        cat_ts.setdefault(c, {'category': c, 'weeks': [], 'scale': [], 'growth': [], 'brandCount': [], 'brandConcentration': [], 'top10Concentration': [], 'newBrands': [], 'newProducts': [], 'yuhongTop100': []})
    for c in cat_ts:
        # 该类目出现的周（升序）
        weeks = sorted(w for (cc, w) in cat_week_raw if cc == c)
        from collections import Counter
        prev_raw = None
        for i, w in enumerate(weeks):
            d = cat_week_raw[(c, w)]
            ts = cat_ts[c]
            ts['weeks'].append(w)
            ts['scale'].append(round(d['scale'], 1))
            ts['brandCount'].append(len(d['brands']))
            ts['yuhongTop100'].append(d['yuhong'])
            top_brand_counts = Counter(d['top10_brands']).most_common(3)
            top3_products = sum(n for _, n in top_brand_counts)
            ts['top10Concentration'].append(round(top3_products / 10.0, 3))
            # 品牌集中度 = Top3 品牌入榜商品数 / 品类入榜商品数
            total_products = len(d['products'])
            top3_all = sum(n for _, n in Counter(d['brand_counts']).most_common(3))
            ts['brandConcentration'].append(round(top3_all / total_products, 3) if total_products else 0.0)
            # growth / newBrands / newProducts
            if prev_raw is not None and prev_raw['scale'] > 0:
                ts['growth'].append(round((d['scale'] - prev_raw['scale']) / prev_raw['scale'], 4))
                ts['newBrands'].append(len(d['brands'] - prev_raw['brands']))
                ts['newProducts'].append(len(d['products'] - prev_raw['products']))
            else:
                ts['growth'].append(0.0)
                ts['newBrands'].append(0)
                ts['newProducts'].append(0)
            prev_raw = d
    categories_out = sorted(cat_ts.values(), key=lambda x: x['category'])

    # ============ products ============
    prod_ts = {}
    for w in present_weeks:
        for r in facts[w]:
            pid = r['productId2']
            if not pid:
                continue
            d = prod_ts.setdefault(pid, {'id': pid, 'name': r['productName'], 'category': r['category'], 'brand': r['brand'], 'weeks': [], 'rank': []})
            d['weeks'].append(w)
            d['rank'].append(r['rank'])
    products_out = sorted(prod_ts.values(), key=lambda x: x['id'])

    # ============ brand_category（品牌×类目热力矩阵，Top100 席位） ============
    bc_ts = {}
    for w in present_weeks:
        week_count = {}
        for r in facts[w]:
            if not r['brand']:
                continue
            key = (r['brand'], r['category'])
            week_count[key] = week_count.get(key, 0) + 1
        for (b, c), seats in week_count.items():
            d = bc_ts.setdefault((b, c), {'brand': b, 'category': c, 'weeks': [], 'seats': []})
            d['weeks'].append(w)
            d['seats'].append(seats)
    brand_category_out = sorted(bc_ts.values(), key=lambda x: (x['brand'], x['category']))

    # ============ segments（细分方向机会榜） ============
    FOCUS = {'彩砂', '防霉', '结构胶', '抽拉', '纳米'}
    seg_week_raw = {}  # (direction, week) -> {seats, top10, scale, brands, products, yuhong, brand_counts}
    for w in present_weeks:
        week = {}
        for r in facts[w]:
            d = r['direction'] or '未识别'
            agg = week.setdefault(d, {'seats': 0, 'top10': 0, 'scale': 0.0, 'brands': set(), 'products': set(), 'yuhong': 0, 'brand_counts': {}})
            agg['seats'] += 1
            if r['rank'] is not None and r['rank'] <= 10:
                agg['top10'] += 1
            agg['scale'] += midpoint(r['visitors'])
            if r['brand']:
                agg['brands'].add(r['brand'])
                agg['brand_counts'][r['brand']] = agg['brand_counts'].get(r['brand'], 0) + 1
            if r['productId2']:
                agg['products'].add(r['productId2'])
            if r['isMine']:
                agg['yuhong'] += 1
        for d, agg in week.items():
            seg_week_raw[(d, w)] = agg

    seg_ts = {}
    for (d, _w), _ in seg_week_raw.items():
        seg_ts.setdefault(d, {'direction': d, 'focus': d in FOCUS, 'weeks': [], 'seats': [], 'top10': [], 'scale': [], 'growth4w': [], 'newProducts': [], 'yuhongSeats': [], 'brandCount': [], 'concentration': [], 'opportunityScore': []})
    for d in seg_ts:
        weeks = sorted(w for (dd, w) in seg_week_raw if dd == d)
        for i, w in enumerate(weeks):
            agg = seg_week_raw[(d, w)]
            ts = seg_ts[d]
            ts['weeks'].append(w)
            ts['seats'].append(agg['seats'])
            ts['top10'].append(agg['top10'])
            ts['scale'].append(round(agg['scale'], 1))
            ts['yuhongSeats'].append(agg['yuhong'])
            ts['brandCount'].append(len(agg['brands']))
            total = len(agg['products'])
            top3 = sum(n for _, n in Counter(agg['brand_counts']).most_common(3))
            ts['concentration'].append(round(top3 / total, 3) if total else 0.0)
            j = max(0, i - 4)
            prev_scale = seg_week_raw[(d, weeks[j])]['scale']
            growth4w = (agg['scale'] - prev_scale) / prev_scale if prev_scale > 0 else 0.0
            ts['growth4w'].append(round(growth4w, 4))
            prev_products = seg_week_raw[(d, weeks[i - 1])]['products'] if i > 0 else set()
            ts['newProducts'].append(len(agg['products'] - prev_products))
            ts['opportunityScore'].append(0.0)  # 统一归一化后回填

    # 机会评分（每周跨方向归一化）：
    #   = 0.30*规模增长 + 0.25*搜索热度(规模) + 0.20*新品进入 − 0.10*品牌集中度 − 0.15*雨虹已覆盖
    for w in present_weeks:
        dirs = [d for d in seg_ts if w in seg_ts[d]['weeks']]
        if not dirs:
            continue

        def _val(key):
            return [seg_ts[d][key][seg_ts[d]['weeks'].index(w)] for d in dirs]

        def _norm(vals):
            hi = max(vals)
            return [v / hi if hi > 0 else 0.0 for v in vals]

        s_n = _norm([max(0.0, v) for v in _val('scale')])
        g_n = _norm([max(0.0, v) for v in _val('growth4w')])
        n_n = _norm([float(v) for v in _val('newProducts')])
        y_n = _norm([float(v) for v in _val('yuhongSeats')])
        concs = _val('concentration')
        for k, d in enumerate(dirs):
            idx = seg_ts[d]['weeks'].index(w)
            score = (0.30 * g_n[k] + 0.25 * s_n[k] + 0.20 * n_n[k] - 0.10 * concs[k] - 0.15 * y_n[k]) * 100
            seg_ts[d]['opportunityScore'][idx] = round(max(0.0, score), 1)
    segments_out = sorted(seg_ts.values(), key=lambda x: (-max(x['opportunityScore']) if x['opportunityScore'] else 0))

    # ============ 写文件 ============
    out_dir = os.path.join(DATA, 'timeseries')
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, 'brands.json'), 'w', encoding='utf-8') as f:
        json.dump(brands_out, f, ensure_ascii=False)
    with open(os.path.join(out_dir, 'categories.json'), 'w', encoding='utf-8') as f:
        json.dump(categories_out, f, ensure_ascii=False)
    with open(os.path.join(out_dir, 'products.json'), 'w', encoding='utf-8') as f:
        json.dump(products_out, f, ensure_ascii=False)
    with open(os.path.join(out_dir, 'brand_category.json'), 'w', encoding='utf-8') as f:
        json.dump(brand_category_out, f, ensure_ascii=False)
    with open(os.path.join(out_dir, 'segments.json'), 'w', encoding='utf-8') as f:
        json.dump(segments_out, f, ensure_ascii=False)

    print(f'完成: brands={len(brands_out)}, categories={len(categories_out)}, products={len(products_out)}, brand_category={len(brand_category_out)}, segments={len(segments_out)}')


if __name__ == '__main__':
    main()
