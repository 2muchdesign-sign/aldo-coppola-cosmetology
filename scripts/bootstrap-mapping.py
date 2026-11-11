"""Одноразовая черновая разметка: прайс -> data/mapping.yaml по правилам.
Дальше mapping.yaml правится руками; повторный запуск НЕ перезаписывает файл без --force."""
import re, sys, os, yaml
sys.path.insert(0, os.path.dirname(__file__))
from prices import read_prices

# (категория-regex, название-regex, procedure, device). Первое совпадение выигрывает.
R = [
 # исключения в «ДЛЯ МУЖЧИН» и «Комплексы» — не косметология
 ("ДЛЯ МУЖЧИН", r"AmCREW|Камуфляж|Touch of grey|[Бб]ритье|бороды|Стрижка|Моделирование бороды|маникюр|педикюр|Мытье|Спа-мытье|Массаж головы|Массаж рук|Ампула Hair|Трихолог|Time to Grow|Коррекция формы бровей|Освежающий уход для рук|Металл-детокс", "EXCLUDE", None),
 ("Комплексы", r".", "EXCLUDE", None),
 (".", r"Ultraformer.*(живот|бока|галифе)", "hifu-tela", "ultraformer"),
 (".", r"Ultraformer", "smas-lifting-hifu", "ultraformer"),
 (".", r"Liftera", "smas-lifting-hifu", "liftera-a"),
 (".", r"Ulfit", "hifu-tela", "ulfit"),
 (".", r"Morpheus", "mikroigolchatyy-rf-lifting", "inmode-morpheus8"),
 (".", r"InMode Forma", "rf-lifting", "inmode-forma"),
 (".", r"Lumecca", "fotoomolozhenie", "inmode-lumecca"),
 ("МОДЕЛИРОВАНИЕ", r"Scarlet", "rf-lifting-tela", "scarlet-rf"),
 (".", r"Scarlet", "mikroigolchatyy-rf-lifting", "scarlet-rf"),
 ("МОДЕЛИРОВАНИЕ", r"ENDYMED", "rf-lifting-tela", "endymed"),
 (".", r"ENDYMED.*микроиг", "mikroigolchatyy-rf-lifting", "endymed"),
 (".", r"ENDYMED", "rf-lifting", "endymed"),
 ("МОДЕЛИРОВАНИЕ", r"Maximus", "rf-lifting-tela", "maximus"),
 (".", r"Maximus", "rf-lifting", "maximus"),
 (".", r"Volnewmer", "rf-lifting", "volnewmer"),
 ("МОДЕЛИРОВАНИЕ", r"So Up", "rf-lifting-tela", "so-up"),
 (".", r"So Up", "rf-lifting", "so-up"),
 (".", r"Innofill.*рубц", "korrekciya-rubcov", "innofill"),
 (".", r"Innofill.*(лица|подбородка)", "rf-liposakciya-podborodka", "innofill"),
 (".", r"Innofill", "rf-lifting-tela", "innofill"),
 (".", r"BBL Forever Clear", "lechenie-akne", "bbl"),
 (".", r"BBL Skin Tyte", "infrakrasnyy-termolifting", "bbl"),
 (".", r"BBL", "fotoomolozhenie", "bbl"),
 (".", r"Fotona", "lazernoe-omolozhenie", "fotona"),
 (".", r"NeoGen", "plazmennoe-omolozhenie", "neogen"),
 (".", r"Biogenie", "mikrotoki-i-miostimulyaciya", "biogenie"),
 ("МОДЕЛИРОВАНИЕ", r"Vip Line", "miostimulyaciya-tela", "vip-line"),
 (".", r"Vip Line", "mikrotoki-i-miostimulyaciya", "vip-line"),
 (".", r"Holiday Face", "mikrotoki-i-miostimulyaciya", None),
 (".", r"HydraFacial", "apparatnoe-ochishchenie", "hydrafacial"),
 ("МОДЕЛИРОВАНИЕ", r"Endospheres", "vakuumnyy-massazh-tela", "endospheres"),
 (".", r"Endospheres", "vakuumnyy-massazh-lica", "endospheres"),
 ("МОДЕЛИРОВАНИЕ", r"ICoone", "vakuumnyy-massazh-tela", "icoone"),
 (".", r"ICoone", "vakuumnyy-massazh-lica", "icoone"),
 (".", r"Heleo", "fotodinamicheskaya-terapiya", "heleo-4"),
 (".", r"CoolSculpting", "kriolipoliz", "coolsculpting"),
 (".", r"Mantis", "magnitoterapiya", "mantis"),
 (".", r"Прессотерапия|Bollani", "pressoterapiya", "bollani-new-dinamica"),
 (".", r"DEKA", "lazernaya-epilyaciya", "deka"),
 (".", r"Light Sheer", "lazernaya-epilyaciya", "lightsheer-duet"),
 (".", r"Soprano", "lazernaya-epilyaciya", "soprano"),
 (".", r"[Дд]епиляци", "voskovaya-depilyaciya", None),
 # инъекции
 (".", r"гипергидроз", "lechenie-gipergidroza", None),
 (".", r"Dysport|Xeomin|Миотокс|Релатокс|Botox", "botulinoterapiya", None),
 ("SPRS", r".", "sprs-terapiya", None),
 ("ПЛАЗМОТЕРАПИЯ", r".", "plazmoterapiya", None),
 ("ЛИПОЛИТИКИ", r".", "lipolitiki", None),
 ("НИТЕВОЙ", r".", "nitevoy-lifting", None),
 (".", r"Карбокси|карбокси", "karboksiterapiya", None),
 ("КОНТУРНАЯ ПЛАСТИКА", r"111Skin|CELLCOSMET|Cellcosmet|Jan Marini", "maski", None),
 ("КОНТУРНАЯ ПЛАСТИКА", r".", "konturnaya-plastika", None),
 ("МЕЗОТЕРАПИЯ", r"лонгидаз|Лонгидаза|Дипроспан", "UNMAPPED", None),
 ("МЕЗОТЕРАПИЯ", r".", "biorevitalizaciya-i-mezoterapiya", None),
 ("ДЛЯ МУЖЧИН", r"Viscoderm|Экзосом", "biorevitalizaciya-i-mezoterapiya", None),
 ("ДЛЯ МУЖЧИН", r"Mesoline Hair|Protection & Therapy", "UNMAPPED", None),
 ("ВИТАМИННЫЕ|ДЛЯ МУЖЧИН", r"Active Age|Detox|Health Care|Immuno|Long Life|Vitamin Mix|Система капельниц", "kapelnicy", None),
 # уходы
 (".", r"PRXt33|BioRePeel", "pilingi", None),
 (".", r"Face [Ff]itness|Массаж лица 20", "face-fitness", None),
 ("ДЛЯ МУЖЧИН", r"Барбер|Obagi|SEEV", "muzhskie-uhody", None),
 (".", r"Body Fitness|Full Body|массаж|Массаж", "massazh", None),
 (".", r"обертывание|Thalion|Sodashi уход для тела|экспресс-пилинг тела|QMS активное", "obertyvaniya", None),
 (".", r"111SKIN|111Skin", "uhody-111skin", None),
 (".", r"Cellcosmet", "uhody-cellcosmet", None),
 (".", r"QMS", "uhody-qms", None),
 (".", r"Sodashi", "uhody-sodashi", None),
 (".", r"Jan Marini", "uhody-jan-marini", None),
 (".", r"Aldo Coppola", "avtorskiy-uhod", None),
]

ZONES = [(r"лиц[оа]|Face|face|Visage|щёки|верхняя губа", "lico"), (r"глаз|Eye", "glaza"), (r"губ|Lips|Smile", "guby"),
         (r"подбород|нижней части лица", "oval"), (r"ше[яию]", "sheya"), (r"декольте", "dekolte"),
         (r"живот", "zhivot"), (r"бока", "boka"), (r"бедр|галифе", "bedra"), (r"ягодиц", "yagodicy"),
         (r"(^|[^а-я])рук", "ruki"), (r"(^|[^а-я])(ног|голен)", "nogi"), (r"спин|грудь", "spina"), (r"подмыш", "podmyshki"),
         (r"бикини|интимн", "bikini"), (r"[Тт]ело|тела|Body", "telo"), (r"Hair", "kozha-golovy")]

def volume(name):
    for pat, unit in [(r"(\d[\d\s]*)\s*лини", "линий"), (r"(\d[\d\s]*)\s*импульс", "импульсов"), (r"(\d+)\s*мин", "минут"),
                      (r"(\d+[,.]?\d*)\s*мл", "мл"), (r"(\d+)\s*ед\.", "ед."), (r"(\d+)\s*шт", "шт."), (r"(\d+)\s*флакон", "флакон"),
                      (r"(\d+)\s*шприц", "шприц"), (r"(\d+)\s*зон", "зон"), (r"(\d+)\s*пробирк", "пробирка")]:
        m = re.search(pat, name)
        if m: return f"{m.group(1).strip()} {unit}"
    return None

def main():
    out = "data/mapping.yaml"
    if os.path.exists(out) and "--force" not in sys.argv:
        raise SystemExit(f"{out} уже есть — правьте вручную или запустите с --force")
    svc = read_prices()
    entries, excluded = [], []
    for sid, s in sorted(svc.items(), key=lambda x: (x[1]["category"], x[1]["name"])):
        for cat_re, name_re, proc, dev in R:
            if re.search(cat_re, s["category"]) and re.search(name_re, s["name"]):
                break
        else:
            proc, dev = None, None
        if proc == "EXCLUDE":
            excluded.append({"id": sid, "name": s["name"], "reason": "не косметология"}); continue
        if proc in (None, "UNMAPPED"): continue
        zones = [z for pat, z in ZONES if re.search(pat, s["name"])]
        g = "men" if re.search(r"для мужчин|мужск", s["name"], re.I) or s["category"] == "ДЛЯ МУЖЧИН" else None
        e = {"id": sid, "name": s["name"], "procedure": proc, "device": dev, "zones": zones or None, "volume": volume(s["name"])}
        if g: e["gender"] = g
        if re.search(r"для женщин", s["name"]): e["gender"] = "women"
        entries.append(e)
    hdr = ("# Связка: ID услуги YClients -> процедура, аппарат, зоны, объём.\n"
           "# Черновик сгенерирован scripts/bootstrap-mapping.py, дальше правится вручную.\n"
           "# name — только для чтения человеком (берётся из прайса при сборке).\n"
           "# gender: men | women — для фильтра эпиляции и мужских позиций.\n"
           "# exclude — позиции из смешанных категорий («ДЛЯ МУЖЧИН», «Комплексы»), которые не косметология.\n")
    with open(out, "w") as f:
        f.write(hdr)
        yaml.safe_dump({"services": entries, "exclude": excluded}, f, allow_unicode=True, sort_keys=False, width=200)
    print(f"mapped {len(entries)}, excluded {len(excluded)}, total {len(svc)}")

main()
