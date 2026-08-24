#!/usr/bin/env python3
"""
ETL 第1-2步：数据标准化 + 完整度模型
读取源数据，标准化（周次/品牌别名+雨虹三档/类目/ID/缺失值/平台），
产出：
  public/data/index.json              周目录 + 完整度
  public/data/dimensions/categories.json
  public/data/dimensions/brands.json
  public/data/dimensions/segments.json
  public/data/dimensions/products.json
  public/data/facts/week-{NN}.json    第 NN 周事实行（ISO 周）
用法: python3 etl/standardize.py
"""
import pandas as pd
import numpy as np
import json
import os
import re

SRC = '/Users/fengna/Documents/Codex/天猫类目bi看板 tmall-week30-bi-dashboard /第30周天猫重点品类市场竞品周报/销售排名（前100）_天猫重点品类0809.xlsx'
OUT_DIR = '/Users/fengna/Documents/Codex/天猫类目bi看板 tmall-week30-bi-dashboard /tmall-week30-bi-dashboard/public/data'

# ============ 常量 ============
CAT_PATH_MAP = {
    '基础建材>油漆>油漆辅料>防水涂料': '防水涂料',
    '基础建材>配件专区>贴砖配件>勾缝剂': '勾缝剂',
    '基础建材>配件专区>玻璃配件>玻璃胶': '玻璃胶',
    '基础建材>油漆>工业漆>环氧漆(地坪漆)': '地坪漆',
    '基础建材>涂料（乳胶漆）': '乳胶漆',
    '基础建材>油漆>木器漆>水性木器漆': '水性木器漆',
    '基础建材>油漆>艺术漆': '艺术漆',
    '家装主材>厨房>厨房龙头': '厨房龙头',
    '家装主材>厨房>厨盆/水槽>水槽套餐': '水槽套餐',
    '家装主材>卫浴五金>淋浴花洒>恒温花洒套装': '恒温花洒套装',
    '家装主材>卫浴五金>卫浴龙头>面盆龙头/台盆龙头/浴室柜龙头': '面盆龙头',
    '家装主材>卫浴五金>卫浴五金/挂件>地漏': '地漏',
    '家装主材>卫浴五金>卫浴五金/挂件>角阀': '角阀',
    '家装主材>卫浴五金>卫浴五金/挂件>浴巾架/毛巾架': '毛巾架',
    '基础建材>配件专区>贴砖配件>瓷砖胶': '瓷砖胶',
}
CAT_DISPLAY = {'勾缝剂': '美缝/勾缝剂'}
CAT_SHEET = {'勾缝剂': '美缝_勾缝剂'}
CAT_GROUP = {
    '防水涂料': '涂料与防水', '地坪漆': '涂料与防水', '水性木器漆': '涂料与防水',
    '艺术漆': '涂料与防水', '乳胶漆': '涂料与防水',
    '美缝/勾缝剂': '胶粘与辅材', '玻璃胶': '胶粘与辅材', '瓷砖胶': '胶粘与辅材',
    '地漏': '卫浴五金', '毛巾架': '卫浴五金', '角阀': '卫浴五金',
    '面盆龙头': '厨卫水件', '恒温花洒套装': '厨卫水件', '厨房龙头': '厨卫水件',
    '水槽套餐': '厨卫水件',
}

DIRECTION_RULES = {
    '乳胶漆': [('儿童漆', '儿童漆'), ('抗甲醛', '抗甲醛'), ('翻新', '翻新'), ('防霉', '防霉'), ('净味', '净味')],
    '水性木器漆': [('清漆', '清漆'), ('翻新', '翻新')],
    '厨房龙头': [('抽拉', '抽拉'), ('伸缩', '抽拉'), ('净水', '净水'), ('冷热', '冷热')],
    '水槽套餐': [('纳米', '纳米'), ('不锈钢', '不锈钢'), ('单槽', '单槽')],
    '恒温花洒套装': [('恒温', '恒温'), ('钢琴键', '钢琴键'), ('增压', '增压'), ('白色', '白色'), ('暗装', '暗装')],
    '面盆龙头': [('抽拉', '抽拉'), ('入墙', '入墙'), ('感应', '感应'), ('冷热', '冷热')],
    '地漏': [('防臭', '防臭'), ('洗衣机', '洗衣机'), ('不锈钢', '不锈钢')],
    '角阀': [('洗衣机', '洗衣机'), ('一进二出', '一进二出'), ('全铜', '全铜'), ('冷热', '冷热'), ('不锈钢', '不锈钢'), ('三角阀', '三角阀')],
    '毛巾架': [('电热', '电热'), ('免打孔', '免打孔'), ('浴巾架', '浴巾架'), ('不锈钢', '不锈钢')],
}
FOCUS_DIRECTIONS = {'彩砂', '防霉', '结构胶', '抽拉', '纳米'}

SUFFIXES = ['官方自营旗舰店', '家居旗舰店', '建材旗舰店', '厨卫旗舰店', '油漆旗舰店', '涂料旗舰店',
            '五金旗舰店', '卫浴旗舰店', '厨卫空间旗舰店', '厨卫收纳旗舰店', '进口商店', '买手店',
            '集合店', '海外旗舰店', '国际旗舰店', '旗舰店', '专营店', '专卖店', '官方店', '企业店',
            '工厂店', '自营店', '直营店']
MODIFIERS = ['厨卫收纳', '厨卫空间', '卫浴五金', '优尚优品', '厂家直销', '官方', '建材', '厨卫', '卫浴', '家居', '美居', '优品']


def extract_brand(store_name):
    if not store_name or not isinstance(store_name, str):
        return '未知'
    name = store_name.strip()
    for s in sorted(SUFFIXES, key=len, reverse=True):
        if name.endswith(s):
            name = name[:-len(s)].strip()
            break
    for _ in range(3):
        changed = False
        for m in sorted(MODIFIERS, key=len, reverse=True):
            if name.endswith(m):
                name = name[:-len(m)].strip()
                changed = True
                break
        if not changed:
            break
    return name if name else store_name


def yuhong_tier(product_name):
    """雨虹三档：用商品名称判定（权威信号）。东方雨虹 / 雨虹飞鱼 / 雨虹(裸)。"""
    pn = str(product_name) if product_name is not None else ''
    if '东方雨虹' in pn:
        return '东方雨虹'
    if '飞鱼' in pn:
        return '雨虹飞鱼'
    if '雨虹' in pn:
        return '雨虹'
    return None


def canonical_brand(store_name, product_name):
    """规范品牌：雨虹系用商品名称判定；其余用店铺名称提取。"""
    t = yuhong_tier(product_name)
    if t:
        return t
    b = extract_brand(store_name)
    if b.startswith('东方雨虹'):
        return '东方雨虹'
    if '飞鱼' in b:
        return '雨虹飞鱼'
    if '雨虹' in b:
        return '雨虹'
    return b


def get_direction(cat, fenlei, name):
    if fenlei is not None:
        s = str(fenlei).strip()
        if s and s not in ('nan', 'None', ''):
            return s
    if cat in DIRECTION_RULES:
        txt = str(name) if name is not None else ''
        for pat, out in DIRECTION_RULES[cat]:
            if pat in txt:
                return out
    return '未识别'


def to_id(x):
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None
    if isinstance(x, float):
        return str(int(x))
    return str(x).strip()


def to_int(x):
    try:
        if x is None or (isinstance(x, float) and pd.isna(x)) or str(x).strip() == '':
            return None
        return int(float(x))
    except Exception:
        return None


def json_safe(v):
    if v is None:
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else f
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, float) and (pd.isna(v)):
        return None
    if isinstance(v, pd.Timestamp):
        return v.strftime('%Y-%m-%d')
    return v


# ============ 读取 + 标准化 ============
print('Step 1: 读取源数据...')
df = pd.read_excel(SRC, '源数据', header=None)
df.columns = ['日期', '行业排名', '趋势', '类目名称', '商品名称', '商品ID', '商品ID2', '商品关键词',
              '店铺名称', '店铺类型', '支付买家数', '访客数', '预估支付金额', '分类', '简称', '月', '周', '年', '趋势数值']
print(f'  原始行数: {len(df)}')

df['品类'] = df['类目名称'].map(CAT_PATH_MAP)
df = df[df['品类'].notna()].copy()
df['category'] = df['品类'].map(lambda c: CAT_DISPLAY.get(c, c))
print(f'  有效品类行数: {len(df)}')

df['brand'] = [canonical_brand(s, p) for s, p in zip(df['店铺名称'], df['商品名称'])]
df['tier'] = df['商品名称'].map(yuhong_tier)
df['is_mine'] = df['tier'].notna()
df['productId2'] = df['商品ID2'].map(to_id)
df['rank'] = df['行业排名'].map(to_int)
df['direction'] = [get_direction(c, f, n) for c, f, n in zip(df['品类'], df['分类'], df['商品名称'])]

df['week_start'] = pd.to_datetime(df['日期'].str[:10], errors='coerce')
df['week_end'] = pd.to_datetime(df['日期'].str[-10:], errors='coerce')
df['report_week'] = pd.to_numeric(df['周'], errors='coerce').astype('Int64')
df['report_year'] = pd.to_numeric(df['年'], errors='coerce').astype('Int64')
df_raw = df.copy()  # 全量备份（含月度汇总行），仅用于源总行数

# 与 build_excel_w.py 对齐：只保留7天周期；跨年 ISO 第53周(2025-12-29) → 2026年第1周
df = df[(df['week_end'] - df['week_start']).dt.days == 6].copy()
df.loc[(df['report_year'] == 2025) & (df['report_week'] == 53), ['report_year', 'report_week']] = [2026, 1]
df_7d = df.copy()  # 去重前快照，用于完整度异常统计
# 同周同类目同商品去重（保留最新快照）
df = df.sort_values('week_start').drop_duplicates(subset=['report_year', 'report_week', '品类', '商品ID2'], keep='last')
all_weeks = sorted(int(x) for x in df['report_week'].dropna().unique())
week_to_monday = {w: pd.Timestamp.fromisocalendar(2026, w, 1) for w in all_weeks}
print(f'  识别到业务周: {all_weeks}')

# ============ dimensions ============
print('Step 2: 维度标准化...')

# categories.json（固定顺序）
CAT_ORDER = ['勾缝剂', '防水涂料', '玻璃胶', '地漏', '地坪漆', '水性木器漆', '艺术漆',
             '乳胶漆', '瓷砖胶', '毛巾架', '角阀', '面盆龙头', '恒温花洒套装', '厨房龙头', '水槽套餐']
categories = []
for cat in CAT_ORDER:
    disp = CAT_DISPLAY.get(cat, cat)
    full_paths = [k for k, v in CAT_PATH_MAP.items() if v == cat]
    categories.append({
        'key': disp,
        'sheetName': CAT_SHEET.get(cat, cat),
        'group': CAT_GROUP.get(disp, ''),
        'fullPaths': full_paths,
    })

# brands.json
brand_tiers = []
for b in sorted(df['brand'].unique()):
    if not b or b in ('nan', '未知'):
        continue
    tier = b if b in ('东方雨虹', '雨虹飞鱼', '雨虹') else '其他'
    brand_tiers.append({'canonical': b, 'tier': tier, 'isMine': tier != '其他', 'aliases': []})
# 雨虹别名（店铺名提取变体 → 规范名）
yuhong_alias_map = {'东方雨虹': [], '雨虹飞鱼': [], '雨虹': []}
for s in df['店铺名称'].astype(str).unique():
    eb = extract_brand(s)
    if eb.startswith('东方雨虹') and eb != '东方雨虹':
        yuhong_alias_map['东方雨虹'].append(eb)
    elif '飞鱼' in eb and eb != '雨虹飞鱼':
        yuhong_alias_map['雨虹飞鱼'].append(eb)
    elif '雨虹' in eb and eb not in ('东方雨虹', '雨虹飞鱼'):
        yuhong_alias_map['雨虹'].append(eb)
for bt in brand_tiers:
    bt['aliases'] = sorted(set(yuhong_alias_map.get(bt['canonical'], [])))

# segments.json
seg_cats = {}
for cat in CAT_ORDER:
    cat_df = df[df['品类'] == cat]
    dirs = cat_df['direction'].dropna().unique()
    for d in dirs:
        if d and d != '未识别':
            seg_cats.setdefault(d, []).append(CAT_DISPLAY.get(cat, cat))
segments = [{
    'direction': d,
    'categories': sorted(set(cs)),
    'focus': d in FOCUS_DIRECTIONS,
} for d, cs in sorted(seg_cats.items(), key=lambda x: -len(x[1]))]

# products.json
products = []
seen = set()
for _, row in df.sort_values('week_start').iterrows():
    pid = row['productId2']
    if not pid or pid in seen:
        continue
    seen.add(pid)
    products.append({
        'id': pid,
        'name': json_safe(row['商品名称']),
        'category': json_safe(row['category']),
        'brand': json_safe(row['brand']),
        'firstWeek': int(row['report_week']) if pd.notna(row['report_week']) else None,
    })

# ============ facts + index ============
print('Step 3: 事实分周 + 完整度模型...')
FACT_COLS = ['日期', '行业排名', '趋势', '类目名称', '商品名称', '商品ID', '商品ID2', '商品关键词',
             '店铺名称', '店铺类型', '支付买家数', '访客数', '预估支付金额', '分类', '简称', '月', '周', '年', '趋势数值']
FACT_KEYS = ['date', 'rank', 'trend', 'categoryPath', 'productName', 'productId', 'productId2',
             'keywords', 'shopName', 'shopType', 'buyers', 'visitors', 'amount', 'segmentRaw',
             'alias', 'sourceMonth', 'sourceWeek', 'sourceYear', 'trendValue']
DERIVED_KEYS = ['category', 'brand', 'tier', 'isMine', 'direction', 'week', 'weekMonday']


def fact_row(row, week, monday):
    r = {k: json_safe(row[c]) for k, c in zip(FACT_KEYS, FACT_COLS)}
    r['rank'] = to_int(row['行业排名'])
    r['productId2'] = to_id(row['商品ID2'])
    r['category'] = json_safe(row['category'])
    r['brand'] = json_safe(row['brand'])
    r['tier'] = json_safe(row['tier'])
    r['isMine'] = bool(row['is_mine'])
    r['direction'] = json_safe(row['direction'])
    shop_type = str(row['店铺类型']).strip() if pd.notna(row['店铺类型']) else ''
    r['platform'] = '天猫' if '天猫' in shop_type else ('淘宝' if '淘宝' in shop_type else '其他')
    r['week'] = int(week) if week is not None else None
    r['weekMonday'] = monday.strftime('%Y-%m-%d') if pd.notna(monday) else None
    return r


index = []
os.makedirs(os.path.join(OUT_DIR, 'facts'), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, 'dimensions'), exist_ok=True)

for week in sorted(week_to_monday.keys()):
    monday = week_to_monday[week]
    dedup_wk = df[df['report_week'] == week]
    raw_wk = df_7d[df_7d['report_week'] == week]
    # 完整度
    present = sorted(dedup_wk['category'].dropna().unique())
    missing = [CAT_DISPLAY.get(c, c) for c in CAT_ORDER if CAT_DISPLAY.get(c, c) not in present]
    total_rows = len(dedup_wk)
    cat_count = dedup_wk['category'].nunique()
    coverage = round(cat_count / 15, 4)
    # 原始行异常统计
    raw_id_null = raw_wk['商品ID2'].map(to_id).isna().sum()
    raw_rank_null = raw_wk['行业排名'].map(to_int).isna().sum()
    raw_vis_null = raw_wk['访客数'].isna().sum()
    dup = len(raw_wk) - len(dedup_wk)
    quality = 'complete' if cat_count == 15 else 'sparse'
    if dup > 0:
        quality = 'partial'
    risk = []
    if cat_count < 15:
        risk.append(f'类目覆盖 {cat_count}/15，缺失 {len(missing)} 个类目')
    if dup > 0:
        risk.append(f'同周同类目重复商品 {dup} 行（已去重保留最新）')
    if raw_id_null > 0:
        risk.append(f'商品ID2 空值 {int(raw_id_null)} 行')
    if raw_vis_null > 0:
        risk.append(f'访客数空值 {int(raw_vis_null)} 行')
    end = monday + pd.Timedelta(days=6)
    index.append({
        'week': week,
        'period': f"{monday.strftime('%Y-%m-%d')} ~ {end.strftime('%Y-%m-%d')}",
        'monday': monday.strftime('%Y-%m-%d'),
        'totalRows': total_rows,
        'categoryCount': cat_count,
        'categoryTotal': 15,
        'categoryCoverage': coverage,
        'presentCategories': present,
        'missingCategories': missing,
        'quality': quality,
        'rowAnomalies': {
            'duplicateProductIds': dup,
            'nullId': int(raw_id_null),
            'nullRank': int(raw_rank_null),
            'nullVisitors': int(raw_vis_null),
        },
        'riskNotes': risk,
    })
    # facts 输出
    rows = [fact_row(r, week, monday) for _, r in dedup_wk.sort_values(['品类', 'rank']).iterrows()]
    fpath = os.path.join(OUT_DIR, 'facts', f'week-{week:02d}.json')
    with open(fpath, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False)

# ============ 写维度 + index ============
print('Step 4: 写维度 + index...')
with open(os.path.join(OUT_DIR, 'dimensions', 'categories.json'), 'w', encoding='utf-8') as f:
    json.dump(categories, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, 'dimensions', 'brands.json'), 'w', encoding='utf-8') as f:
    json.dump(brand_tiers, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, 'dimensions', 'segments.json'), 'w', encoding='utf-8') as f:
    json.dump(segments, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT_DIR, 'dimensions', 'products.json'), 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False)
with open(os.path.join(OUT_DIR, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print('\n完成! 产出:')
print(f'  index.json: {len(index)} 周')
print(f'  dimensions/: categories={len(categories)}, brands={len(brand_tiers)}, segments={len(segments)}, products={len(products)}')
print(f'  facts/: {len(week_to_monday)} 个周文件')
# 完整度概览
sparse = [w['week'] for w in index if w['quality'] != 'complete']
print(f'  非 complete 周: {sparse}')
