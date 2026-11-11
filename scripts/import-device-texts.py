"""Черновики текстов аппаратов со старого сайта -> data/device-texts.yaml и производитель/страна -> data/devices.yaml.
Берём только «Принцип работы» и «Показания к применению». Цены и «Где представлен» отбрасываем (ТЗ, раздел 2).
Запуск: .venv/bin/python scripts/import-device-texts.py <drafts.yaml из extract-old-site.py>"""
import re, sys, yaml

TITLE_TO_SLUG = {
    "BBL": ["bbl"], "Biogenie": ["biogenie"], "CoolSculpting": ["coolsculpting"], "DEKA Motus AX": ["deka"],
    "Endospheres": ["endospheres"], "Endymed RF": ["endymed"], "Fotona": ["fotona"], "HydraFacial": ["hydrafacial"],
    "InMode": ["inmode-morpheus8", "inmode-forma", "inmode-lumecca"], "Liftera-A": ["liftera-a"],
    "LightSheer DUET": ["lightsheer-duet"], "Mantis": ["mantis"], "Maximus": ["maximus"], "Scarlet RF": ["scarlet-rf"],
    "Soprano ICE": ["soprano"], "Ulfit": ["ulfit"], "Ultraformer": ["ultraformer"], "VipLine": ["vip-line"], "ICOONE LASER": ["icoone"],
    # unconfirmed — тексты сохраняем, на сайт не выводятся
    "Harmony XL": ["harmony-xl"], "MERMAID": ["mermaid"], "Gezatone": ["gezatone"], "Skin Master": ["skin-master"],
    "Friendly Light": ["friendly-light"], "Medozons": ["medozons"], "Ксенонотерапия": ["ksenonoterapiya"], "LumiCell Wave 6": ["lumicell-wave-6"],
}

def section(text, start, stops):
    m = re.search(start + r"\s*:?\s*\n?(.*?)(?=\n(?:" + "|".join(stops) + r")\s*:|\Z)", text, re.S | re.I)
    return m.group(1).strip() if m else None

drafts = yaml.safe_load(open(sys.argv[1], encoding="utf-8"))
texts, meta = {}, {}
for d in drafts:
    d["text"] = d["text"].replace("\xa0", " ").replace(" ", " ")
    d["title"] = d["title"].replace("\xa0", " ")
    m = re.match(r"(.+?)\s*\((.+)\)\s*$", d["title"])
    name, paren = (m.group(1).strip(), m.group(2)) if m else (d["title"], "")
    slugs = TITLE_TO_SLUG.get(name)
    if not slugs: continue
    parts = [p.strip() for p in re.split(r",", paren)]
    country = parts[-1] if parts else None
    maker = parts[0] if len(parts) > 1 else None
    stops = ["Показания к применению", "Стоимость процедур", "Где представлен", "Принцип работы"]
    principle = section(d["text"], "Принцип работы", stops[:3])
    indications = section(d["text"], "Показания к применению", ["Стоимость процедур", "Где представлен", "Принцип работы"])
    ind = [re.sub(r"^[·•\-\s]+", "", l).strip() for l in (indications or "").splitlines() if l.strip()]
    for s in slugs:
        cur = texts.get(s)
        if not cur or len(principle or "") > len(cur.get("principle") or ""):
            texts[s] = {"source": f"cosmetology.aldocoppola.ru — «{d['title']}»", "status": "draft", "principle": principle, "indications": ind}
        meta[s] = {"country": country, "manufacturer": maker, "old_title": d["title"]}

hdr = ("# Черновики текстов аппаратов со старого сайта (ТЗ, раздел 2). status: draft — до проверки врачом.\n"
       "# Цены и «Где представлен» со старого сайта НЕ переносятся. Править здесь; врач меняет status на reviewed.\n")
with open("data/device-texts.yaml", "w", encoding="utf-8") as f:
    f.write(hdr); yaml.safe_dump(texts, f, allow_unicode=True, sort_keys=True, width=200)

# производитель и страна -> devices.yaml (только там, где сейчас TODO)
p = "data/devices.yaml"; src = open(p, encoding="utf-8").read()
out = []
for line in src.splitlines():
    m = re.match(r"- \{slug: ([a-z0-9-]+),", line)
    if m and m.group(1) in meta:
        mm = meta[m.group(1)]
        if mm["country"]: line = line.replace("country: TODO", f"country: {mm['country']}")
        if mm["manufacturer"]: line = line.replace("manufacturer: TODO", f"manufacturer: {mm['manufacturer']}")
    out.append(line)
open(p, "w", encoding="utf-8").write("\n".join(out) + "\n")
print(f"texts: {len(texts)}; meta: {len(meta)}")
