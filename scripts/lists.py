"""Человекочитаемые списки процедур и целей из catalog.json -> reports/lists.md"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
c = json.load(open(os.path.join(ROOT, "data/catalog.json")))
S = {s["slug"]: s["short"] for s in c["salons"]}; D = {d["slug"]: d["name"] for d in c["devices"]}
P = {p["slug"]: p for p in c["procedures"]}
DIR = [("apparatnaya", "Аппаратная косметология · лицо"), ("telo", "Тело"), ("lazernaya-epilyaciya", "Эпиляция"),
       ("uhody", "Уходы и пилинги"), ("inekcii", "Инъекции"), ("kapelnicy", "Капельницы")]
f = lambda n: f"{n:,}".replace(",", " ") + " ₽" if n else "—"
L = [f"# Списки для согласования — {c['built_at']}", "", "## Процедуры по направлениям", "",
     "Цена «от» — минимальная базовая цена (строка «По умолчанию») среди салонов, мужские позиции отдельно. ⓚ — сначала консультация.", ""]
for d, title in DIR:
    L += [f"### {title}", "", "| Процедура | от | Аппараты | Салоны | Услуг |", "|---|---|---|---|---|"]
    for p in c["procedures"]:
        if p["direction"] != d: continue
        men = f" (муж. от {f(p['price_from_men'])})" if p.get("price_from_men") and p["price_from_men"] != p["price_from"] else ""
        L.append(f"| {p['name']}{' ⓚ' if p['consultation_first'] else ''} | {f(p['price_from'])}{men} | {', '.join(D[x] for x in p['devices']) or '—'} | {' · '.join(S[x] for x in p['salons'])} | {len(p['services'])} |")
    L.append("")
L += ["## Цели по группам", ""]
for g in c["goal_groups"]:
    L += [f"### {g['name']}", ""]
    for x in c["goals"]:
        if x["group"] != g["slug"]: continue
        note = f" ⚠ {x['status_note']}" if x.get("status_note") else ""
        L.append(f"- **{x['name']}** ({', '.join(x['terms'])}) → {', '.join(P[p]['name'] for p in x['procedures'])}{note}")
    L.append("")
open(os.path.join(ROOT, "reports/lists.md"), "w").write("\n".join(L)); print("\n".join(L))
