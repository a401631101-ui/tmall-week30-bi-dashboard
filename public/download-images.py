#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把浏览器抓取的 {商品ID: 主图URL} JSON 落成看板要的图片文件 + 映射。

用法：
    python3 download-images.py [source.json]

source.json 默认取 ~/Downloads/product-images.json（fetch-images-week32.js 自动下载到那里）。
也可以显式传路径，例如：
    python3 download-images.py ./product-images.json

产出：
    1. 逐张下载到 product-images/{商品ID}.jpg
    2. 合并进 product-images.json（商品ID -> "./product-images/商品ID.jpg"）
    3. 打印成功/失败统计，失败的 ID 单独列出便于重试
"""
import json, os, sys, time, urllib.request, urllib.error

BASE = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(BASE, "product-images")
MAP_FILE = os.path.join(BASE, "product-images.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/product-images.json")
    if not os.path.exists(src):
        print(f"❌ 找不到源文件: {src}")
        print("   请先在天猫详情页 Console 里运行 fetch-images-week32.js，")
        print("   它会把 product-images.json 下载到 ~/Downloads/。")
        sys.exit(1)

    data = json.load(open(src, encoding="utf-8"))
    if not isinstance(data, dict):
        print("❌ 源文件不是 {商品ID: URL} 字典格式")
        sys.exit(1)
    print(f"读到 {len(data)} 条 商品ID->URL")

    # 现有映射
    existing = {}
    if os.path.exists(MAP_FILE):
        existing = json.load(open(MAP_FILE, encoding="utf-8"))

    os.makedirs(IMG_DIR, exist_ok=True)
    ok, fail = [], []
    for pid, url in data.items():
        pid = str(pid).strip()
        url = (url or "").strip()
        if url.startswith("//"):
            url = "https:" + url
        if not url.lower().startswith("http"):
            fail.append((pid, "非法URL: " + url))
            continue
        # 优先 https、去掉 _50x50 等缩略图后缀换成原图
        url = url.replace("_50x50.jpg", ".jpg").replace("_100x100.jpg", ".jpg").replace("_200x200.jpg", ".jpg")
        target = os.path.join(IMG_DIR, f"{pid}.jpg")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://detail.tmall.com/"})
            with urllib.request.urlopen(req, timeout=30) as r:
                blob = r.read()
            if len(blob) < 500:
                fail.append((pid, "内容过小(%dB)" % len(blob)))
                continue
            with open(target, "wb") as f:
                f.write(blob)
            existing[pid] = f"./product-images/{pid}.jpg"
            ok.append(pid)
            print(f"✅ {pid}  ({len(blob)//1024}KB)")
        except urllib.error.HTTPError as e:
            fail.append((pid, f"HTTP {e.code}"))
            print(f"❌ {pid}  HTTP {e.code}")
        except Exception as e:
            fail.append((pid, str(e)[:60]))
            print(f"❌ {pid}  {e}")
        time.sleep(0.15)

    json.dump(existing, open(MAP_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"\n===== 完成 =====")
    print(f"成功 {len(ok)} / {len(data)}")
    print(f"product-images.json 现共 {len(existing)} 条映射")
    if fail:
        print(f"失败 {len(fail)} 条（可单独重试）:")
        for pid, why in fail:
            print(f"  - {pid}: {why}")

if __name__ == "__main__":
    main()
