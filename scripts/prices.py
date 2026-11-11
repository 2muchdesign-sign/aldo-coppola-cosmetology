"""Чтение прайсов YClients (общий модуль для build-catalog и bootstrap-mapping)."""
import glob, html, os, unicodedata
import xlrd

PRICE_DIR = os.path.expanduser("~/Downloads/Work Claude/13 Прайс листы/Прайс листы всех салонов для YClients_nov2026")
FILE_TO_SALON = {"Жуковка": "zhukovka", "Барвиха": "barvikha", "Новинский": "veb-rf", "Времена года": "vremena-goda",
                 "Весна": "boscovesna", "Юнимолл": "unimall", "Лотте": "lotte"}
COSMETOLOGY = {"АППАРАТНАЯ КОСМЕТОЛОГИЯ", "ЛАЗЕРНАЯ ЭПИЛЯЦИЯ", "УХОДЫ ДЛЯ ЛИЦА", "АВТОРСКИЙ МАССАЖ ЛИЦА FACE FITNESS BY ALDO COPPOLA",
               "КОНТУРНАЯ ПЛАСТИКА", "БОТУЛИНОТЕРАПИЯ", "МЕЗОТЕРАПИЯ И БИОРЕВИТАЛИЗАЦИЯ", "ПЛАЗМОТЕРАПИЯ", "SPRS-ТЕРАПИЯ",
               "ЛИПОЛИТИКИ", "НИТЕВОЙ ЛИФТИНГ", "ВИТАМИННЫЕ КАПЕЛЬНЫЕ КОКТЕЙЛИ", "МАССАЖИ И ОБЁРТЫВАНИЯ",
               "МОДЕЛИРОВАНИЕ КОНТУРОВ ТЕЛА", "ВОСКОВАЯ ДЕПИЛЯЦИЯ"}
MIXED = {"ДЛЯ МУЖЧИН", "Комплексы"}  # берём только позиции, размеченные в mapping.yaml

def nfc(s): return unicodedata.normalize("NFC", s)
def clean(s): return " ".join(html.unescape(str(s)).split())

def read_prices(price_dir=PRICE_DIR):
    """-> {service_id: {category, name, online_name, offers: {salon: {price, price_to, duration_min, rows}}}}"""
    services = {}
    files = sorted(glob.glob(os.path.join(price_dir, "*.xls")))
    if not files: raise SystemExit(f"Нет прайсов в {price_dir}")
    for path in files:
        stem = nfc(os.path.basename(path))[:-4]
        salon = FILE_TO_SALON[stem]
        sh = xlrd.open_workbook(path, ignore_workbook_corruption=True).sheet_by_index(0)
        rows = {}
        for r in range(1, sh.nrows):
            v = sh.row_values(r)
            cat = clean(v[0])
            if cat not in COSMETOLOGY and cat not in MIXED: continue
            sid = int(v[1])
            e = services.setdefault(sid, {"id": sid, "category": cat, "name": clean(v[2]), "online_name": clean(v[4]), "offers": {}})
            rows.setdefault(sid, []).append({"default": clean(v[10]) == "По умолчанию", "price": float(v[6] or 0),
                                             "price_to": float(v[7] or 0), "duration": int(float(v[11] or 0))})
        for sid, rr in rows.items():
            d = [x for x in rr if x["default"]]
            base = d[0]["price"] if d else min(x["price"] for x in rr)
            mx = max(max(x["price"], x["price_to"]) for x in rr)
            dur = (d[0] if d else rr[0])["duration"]
            services[sid]["offers"][salon] = {"price": int(base), "price_to": int(mx) if mx > base else None,
                                              "duration_min": dur // 60, "rows": len(rr), "default_row": bool(d)}
    return services
