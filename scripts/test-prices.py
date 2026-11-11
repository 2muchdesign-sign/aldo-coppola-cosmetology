"""Критерий приёмки №1: цены catalog.json совпадают с исходными .xls (независимое перечтение прайсов)."""
import json, os, sys, glob, unicodedata, xlrd
sys.path.insert(0, os.path.dirname(__file__))
from prices import PRICE_DIR, FILE_TO_SALON
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cat = json.load(open(os.path.join(ROOT, "data/catalog.json")))
src = {}
for p in glob.glob(os.path.join(PRICE_DIR, "*.xls")):
    sl = FILE_TO_SALON[unicodedata.normalize("NFC", os.path.basename(p))[:-4]]
    sh = xlrd.open_workbook(p, ignore_workbook_corruption=True).sheet_by_index(0)
    for r in range(1, sh.nrows):
        v = sh.row_values(r); k = (int(v[1]), sl)
        src.setdefault(k, []).append((str(v[10]).strip() == "По умолчанию", int(v[6])))
bad = 0
for o in cat["offers"]:
    rows = src.get((o["service"], o["salon"]))
    exp = next((p for d, p in rows if d), min(p for _, p in rows)) if rows else None
    if exp != o["price"]: bad += 1; print("MISMATCH", o, exp)
print(f"offers checked: {len(cat['offers'])}, mismatches: {bad}"); sys.exit(1 if bad else 0)
