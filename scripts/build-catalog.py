"""Сборка data/catalog.json из прайсов YClients + справочников и отчёт reports/unmapped.md.
Запуск: .venv/bin/python scripts/build-catalog.py"""
import json, os, sys, datetime, yaml
sys.path.insert(0, os.path.dirname(__file__))
from prices import read_prices, PRICE_DIR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def Y(n): return yaml.safe_load(open(os.path.join(ROOT, "data", n), encoding="utf-8"))
DIFF_LIMIT = 0.10

def main():
    salons = Y("salons.yaml"); devices = Y("devices.yaml"); procs = Y("procedures.yaml")["procedures"]
    goalsdoc = Y("goals.yaml"); zones = Y("zones.yaml"); mapping = Y("mapping.yaml"); synonyms = Y("synonyms.yaml")
    dtexts = Y("device-texts.yaml") if os.path.exists(os.path.join(ROOT, "data", "device-texts.yaml")) else {}
    for d in devices: d["text"] = dtexts.get(d["slug"])
    S = {s["slug"]: s for s in salons}; order = [s["slug"] for s in salons]
    D = {d["slug"]: d for d in devices}; P = {p["slug"]: p for p in procs}
    M = {m["id"]: m for m in mapping["services"] + (mapping.get("services_manual") or [])}; HIDE = {(h["service"], h["salon"]): h["reason"] for h in mapping.get("hide_offers") or []}; EX = {e["id"]: e for e in mapping.get("exclude", [])}
    prices = read_prices()
    problems = {k: [] for k in ["unmapped", "missing_in_prices", "bad_ref", "no_default", "diff", "hidden", "no_offers", "dev_no_services"]}

    # оборудование, реально присутствующее в салоне (по женским/общим позициям) — для проверки мужских шаблонов
    dev_in_salon = {}
    for sid, s in prices.items():
        m = M.get(sid)
        if m and m.get("device") and m.get("gender") != "men":
            for sl in s["offers"]: dev_in_salon.setdefault(m["device"], set()).add(sl)

    services, offers = [], []
    for sid, s in sorted(prices.items()):
        if sid in EX: continue
        m = M.get(sid)
        if not m:
            problems["unmapped"].append(s); continue
        if m["procedure"] not in P: problems["bad_ref"].append(f"{sid}: процедура `{m['procedure']}` нет в procedures.yaml")
        if m.get("device") and m["device"] not in D: problems["bad_ref"].append(f"{sid}: аппарат `{m['device']}` нет в devices.yaml")
        services.append({"id": sid, "name": s["name"], "category": s["category"], "procedure": m["procedure"], "device": m.get("device"),
                         "zones": m.get("zones") or [], "volume": m.get("volume"), "gender": m.get("gender")})
        vis = []
        for sl in order:
            o = s["offers"].get(sl)
            if not o: continue
            hidden, reason = False, None
            if not S[sl]["has_cosmetology"]:
                hidden, reason = True, "уточнить: в салоне нет косметологии (мужская позиция из общего шаблона)"
            elif m.get("gender") == "men" and m.get("device") and sl not in dev_in_salon.get(m["device"], set()):
                problems.setdefault("men_template", []).append((s["name"], S[sl]["name"]))  # показываем, но отмечаем в отчёте
            if (sid, sl) in HIDE: hidden, reason = True, HIDE[(sid, sl)]
            if not o["default_row"]: problems["no_default"].append((sid, s["name"], S[sl]["name"]))
            offers.append({"service": sid, "salon": sl, "price": o["price"], "price_to": o["price_to"], "duration_min": o["duration_min"],
                           "hidden": hidden, **({"hidden_reason": reason} if reason else {})})
            if hidden: problems["hidden"].append((s["name"], S[sl]["name"], reason))
            else: vis.append((sl, o["price"]))
        if len(vis) > 1:
            lo, hi = min(p for _, p in vis), max(p for _, p in vis)
            if lo and (hi - lo) / lo > DIFF_LIMIT:
                problems["diff"].append((sid, s["name"], ", ".join(f"{S[a]['short']} {p:,}".replace(",", " ") for a, p in vis), round((hi-lo)/lo*100)))
    for mid, m in M.items():
        if mid not in prices: problems["missing_in_prices"].append(f"{mid} {m.get('name')}")

    # агрегаты по процедурам
    svc_by_id = {s["id"]: s for s in services}
    agg = {}
    for o in offers:
        if o["hidden"]: continue
        s = svc_by_id[o["service"]]; a = agg.setdefault(s["procedure"], {"salons": set(), "devices": set(), "zones": set(), "prices": [], "prices_men": [], "services": set()})
        a["salons"].add(o["salon"]); (a["prices_men"] if s["gender"] == "men" else a["prices"]).append(o["price"]); a["services"].add(s["id"]); a["zones"].update(s["zones"])
        if s["device"]: a["devices"].add(s["device"])
    goals = goalsdoc["goals"]
    proc_goals = {}
    for g in goals:
        for p in g.get("procedures", []):
            if p not in P: problems["bad_ref"].append(f"цель `{g['slug']}`: процедуры `{p}` нет")
            proc_goals.setdefault(p, []).append(g["slug"])
    # зоны процедуры = зоны из названий услуг прайса + зоны её целей (goals.yaml), чтобы схема зон была полной
    goal_zones = {}
    for g in goals:
        for p in g.get("procedures", []):
            goal_zones.setdefault(p, set()).update(z for z in (g.get("zones") or []) if z != "telo")
    out_procs = []
    for p in procs:
        a = agg.get(p["slug"])
        if not a: problems["no_offers"].append(p);
        zs = (set(a["zones"]) if a else set()) | goal_zones.get(p["slug"], set())
        out_procs.append({**p, "goals": proc_goals.get(p["slug"], []),
                          "devices": sorted(a["devices"]) if a else [], "zones": sorted(zs),
                          "zones_price": sorted(a["zones"]) if a else [],
                          "salons": [s for s in order if a and s in a["salons"]],
                          "price_from": min(a["prices"] or a["prices_men"]) if a else None, "price_max": max(a["prices"] or a["prices_men"]) if a else None,
                          "price_from_men": min(a["prices_men"]) if a and a["prices_men"] else None,
                          "services": sorted(a["services"]) if a else [], "published": bool(a)})
    used_dev = {s["device"] for s in services if s["device"]}
    for d in devices:
        if d.get("status") == "active" and d["slug"] not in used_dev: problems["dev_no_services"].append(d["slug"])

    built = datetime.date.today().isoformat()
    cat = {"built_at": built, "prices_source": "YClients, ноябрь 2026", "salons": salons,
           "devices": [d for d in devices if d.get("status") == "active"], "devices_unconfirmed": [d["slug"] for d in devices if d.get("status") != "active"],
           "procedures": out_procs, "goal_groups": goalsdoc["groups"], "goals": goals, "zones": zones, "synonyms": synonyms,
           "services": services, "offers": offers, "podbor": Y("podbor.yaml")}
    json.dump(cat, open(os.path.join(ROOT, "data", "catalog.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # отчёт
    L = [f"# Отчёт сборки каталога — {built}", "", f"Источник: `{PRICE_DIR}`", "",
         f"Услуг косметологии в прайсах: {len(prices) - len(EX)} (исключено как не косметология: {len(EX)}) · размечено: {len(services)} · предложений: {len(offers)} (скрыто: {len(problems['hidden'])})", ""]
    def sec(t, rows, empty="нет"):
        L.append(f"## {t}"); L.append("")
        L.extend(rows or [f"_{empty}_"]); L.append("")
    sec("1. Услуги из прайса без связки в mapping.yaml", [f"- `{s['id']}` · {s['category']} · {s['name']} · {', '.join(S[x]['short'] for x in s['offers'])}" for s in problems["unmapped"]])
    sec("2. Процедуры без предложений", [f"- `{p['slug']}` {p['name']}" for p in problems["no_offers"]])
    sec("3. Активные аппараты без услуг", [f"- `{d}`" for d in problems["dev_no_services"]])
    sec(f"4. Расхождение цены одной услуги между салонами > {int(DIFF_LIMIT*100)}%", [f"- `{a}` {b}: {c} — **{d}%**" for a, b, c, d in problems["diff"]])
    sec("5. Скрытые предложения (hidden: true)", sorted({f"- {r}: {b}" for a, b, r in problems["hidden"]}) + [f"  - всего строк: {len(problems['hidden'])}"] if problems["hidden"] else [])
    sec("5а. Мужские позиции с аппаратом, которого нет в женском прайсе салона (показаны, уточнить)", sorted({f"- {a}: {b}" for a, b in problems.get("men_template", [])}))
    sec("6. Нет строки «По умолчанию» (взята минимальная цена)", [f"- `{a}` {b} — {c}" for a, b, c in problems["no_default"]])
    sec("7. ID в mapping.yaml, которых нет в прайсах", [f"- {x}" for x in problems["missing_in_prices"]])
    sec("8. Битые ссылки в справочниках", [f"- {x}" for x in problems["bad_ref"]])
    sec("9. Исключено из смешанных категорий («ДЛЯ МУЖЧИН», «Комплексы»)", [f"- `{e['id']}` {e['name']}" for e in EX.values()])
    sec("10. Аппараты unconfirmed (не выводятся)", [f"- {d['name']}" for d in devices if d.get("status") != "active"])
    open(os.path.join(ROOT, "reports", "unmapped.md"), "w", encoding="utf-8").write("\n".join(L))
    print(f"services {len(services)}, offers {len(offers)}, unmapped {len(problems['unmapped'])}, no_offers {len(problems['no_offers'])}, "
          f"dev_no_services {len(problems['dev_no_services'])}, diff {len(problems['diff'])}, bad_ref {len(problems['bad_ref'])}")

main()
