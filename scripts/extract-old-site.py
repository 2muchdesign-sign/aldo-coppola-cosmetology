"""Черновики текстов аппаратов со старого сайта cosmetology.aldocoppola.ru (блоки .t849).
Цены и «Где представлен» НЕ берём (ТЗ, раздел 2). Результат: data/old-site-drafts.yaml — только черновик для врача."""
import re, sys, html, yaml
src = open(sys.argv[1], encoding="utf-8").read()
blocks = re.split(r'class="t849__wrapper', src)[1:]
out = []
for b in blocks:
    t = re.search(r'class="t849__title[^>]*>(.*?)</', b, re.S)
    x = re.search(r'class="t849__text[^>]*>(.*?)</div>', b, re.S)
    if not t: continue
    title = html.unescape(re.sub(r"<[^>]+>", " ", t.group(1))).strip()
    text = x.group(1) if x else ""
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = html.unescape(re.sub(r"<[^>]+>", "", text))
    text = "\n".join(l.strip() for l in text.splitlines() if l.strip())
    out.append({"title": " ".join(title.split()), "text": text})
yaml.safe_dump(out, open(sys.argv[2], "w", encoding="utf-8"), allow_unicode=True, sort_keys=False, width=200)
print(len(out)); print("\n".join(o["title"] for o in out))
