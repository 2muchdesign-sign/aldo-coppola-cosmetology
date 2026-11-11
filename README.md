# Сайт косметологии Aldo Coppola

ТЗ — `TZ.md`, контекст для Claude Code — `CLAUDE.md`, макеты — `design/`.

## Данные (этап 1)

```bash
python3 -m venv .venv && .venv/bin/pip install xlrd pyyaml
.venv/bin/python scripts/build-catalog.py   # data/catalog.json + reports/unmapped.md
.venv/bin/python scripts/test-prices.py     # сверка цен каталога с .xls (должно быть 0 расхождений)
.venv/bin/python scripts/lists.py           # reports/lists.md — списки процедур и целей для согласования
```

| Файл | Что | Кто правит |
| --- | --- | --- |
| `data/salons.yaml` | салоны, адреса, ссылки записи, медиа | маркетинг |
| `data/devices.yaml` | аппараты, технологии, синонимы, статус | маркетинг |
| `data/procedures.yaml` | процедуры, направление, метод, тексты (TODO) | маркетинг + врач |
| `data/goals.yaml` | цели, клинические термины, связки с процедурами (черновик) | маркетинг + врач |
| `data/zones.yaml` | зоны схемы | маркетинг |
| `data/mapping.yaml` | ID услуги YClients → процедура, аппарат, зоны, объём; исключения; ручное скрытие | дополнять при новых услугах |
| `data/synonyms.yaml` | разговорные слова для поиска | маркетинг |
| `data/catalog.json` | **генерируется**, руками не править | скрипт |

`scripts/bootstrap-mapping.py` — разовая черновая разметка по правилам; mapping.yaml дальше ведётся вручную.

## Что нужно от заказчика

- Ссылки онлайн-записи YClients по каждому салону (и можно ли предвыбирать услугу).
- Телефон, WhatsApp, часы, метро, парковка, координаты — все салоны; адрес ТЦ BoscoVesna.
- Реквизиты медицинской лицензии и юрлица; текст предупреждения, согласованный с юристом.
- Врачи: имена, фото, специализация, салоны; кто проверяет медицинские тексты.
- Производитель и страна аппаратов (в `devices.yaml` — TODO); график перевозимых аппаратов.
- Подтверждение по 8 аппаратам, которых нет в прайсах: Harmony XL, MERMAID, Gezatone, Skin Master, Friendly Light, Medozons, ксенонотерапия, LumiCell Wave 6 (сейчас `unconfirmed`, на сайт не выводятся).
- Ответы по `reports/unmapped.md` (опечатки и расхождения в прайсах, мужские позиции из общего шаблона).
- Фото и видео по списку съёмки (ТЗ, раздел 8), ID Яндекс Метрики.

## Сайт (этапы 2–3)

```bash
PATH="$HOME/.local/node/bin:$PATH" npx astro build    # dist/ — статический сайт
BASE_PATH=/kosmetologiya/ SITE_URL=https://aldocoppola.ru PATH="$HOME/.local/node/bin:$PATH" npx astro build   # сборка под боевой адрес
```

Страницы: `/` хаб · `/procedury/` и `/procedury/<slug>/` · направления `/apparatnaya/`, `/inekcii/`, `/uhody/`, `/lazernaya-epilyaciya/`, `/telo/`, `/kapelnicy/` · `/celi/` · `/zony/` · `/apparaty/` · `/salony/` · `/ceny/` · `/konsultaciya/` · `/vrachi/` · `/podbor/` (мастер — этап 4) · `/dizayn/` (служебная) · `/search-index.json`, `/ceny.json`.

Запись: YClients — `https://<форма>/company/<ID филиала>/personal/select-time?o=s<ID услуги>` (формат проверен 11.11.2026, услуга передаётся); без услуги — `/select-services`. WhatsApp — мобильные номера салонов.

Тексты аппаратов «Принцип работы» и «Показания» — черновики со старого сайта (`data/device-texts.yaml`, status: draft); цены и «Где представлен» оттуда не брались.

### Ещё нужно от заказчика (по ходу этапа 3)
- Стоимость консультации косметолога — отдельной позиции в прайсах нет.
- Часы работы, метро, парковка, координаты салонов (сейчас «[уточняется]»).
- Тексты врача: курс, восстановление, ощущения, «как проходит», противопоказания, комбинации — на страницах стоит «[уточнить у врача]».
- Производитель/страна: Volnewmer, So Up, Innofill, NeoGen, Heleo-4, Bollani (в старом сайте их нет).
- Ссылки на статьи блога aldocoppola.ru для блока «Читайте в блоге».
- Цена Thalion «уход для спины» в Юнимолле — 1 510 ₽ (показывается как в прайсе).

### Этап 4
- Схема зон лица и тела: главная и `/zony/`; координаты точек — `data/zones.yaml`.
- Мастер подбора `/podbor/`: правила — `data/podbor.yaml`. Пожелания «без восстановления» и «быстрый эффект» пока не фильтруют (списки процедур — TODO врача), «без инъекций» убирает инъекции и капельницы, бюджет — по цене «от» в салоне.

## Медиа (этап 5)

Отбор кадров — `data/media.yaml` (только материалы заказчика; кадры с людьми не берём). Обработка:

```bash
PATH="$HOME/.local/node/bin:$PATH" node scripts/media/process-media.mjs     # --force — пересобрать всё
```

Фото → WebP 640/1024/1600 + JPG 1024/1600 (все до ~180 КБ), `<picture>` с `srcset`, lazy ниже первого экрана.
Видеотуры → MP4 H.264 без звука, faststart: Жуковка 6,9 МБ, Барвиха 5,1, БЦ ВЭБ РФ 5,1, ТЦ BoscoVesna 2,6, Юнимолл 6,6 (+ 720p 2,3 МБ для телефона); постеры WebP/JPG.
Сейчас на сайте: 8 кадров на салон (Жуковка, Барвиха, БЦ ВЭБ РФ, ТЦ Времена года, Юнимолл), 3 — ТЦ BoscoVesna (отдельной фотосъёмки нет), 4 — Лотте Отель; фото аппаратов CoolSculpting (Жуковка) и HydraFacial (Юнимолл).

### Список съёмки (нужно от заказчика)
Все места под медиа помечены в HTML `data-todo="media"` и показывают серую заглушку с подсказкой кадра.
- **Аппараты (25 без фото):** BBL, Biogenie, Bollani New Dinamica, DEKA, Endospheres Therapy, EndyMed, Fotona, Heleo-4, ICoone, InMode Forma, InMode Lumecca, InMode Morpheus8, Innofill, Liftera-A, LightSheer Duet, Mantis, Maximus, NeoGen, Scarlet RF, So Up, Soprano, Ulfit, Ultraformer, Vip Line, Volnewmer — фото 4:5 и 16:9 + видео 10–15 с в кабинете (без звука).
- **Процедуры (43 карточки без своего кадра):** видео 10–15 с «процедура крупно», руки врача, подготовка.
- **Цели на главной:** видео 10 с — макро кожи (молодость и тонус), текстура кожи (чистая кожа), силуэт (контуры тела).
- **Первый экран:** вертикальное видео кабинета косметологии 8–20 с (сейчас фото кабинета ТЦ Времена года).
- **ТЦ BoscoVesna:** фотосъёмка салона и кабинетов (в папке «Фото салонов» только видео 57 МБ).
- **Врачи:** портреты 4:5 и короткие видео «врач рассказывает» 9:16.
- **Детали:** текстуры уходов 111SKIN, руки врача, подготовка процедуры.
- **До/после** — только после согласования с юристом (`CONFIG.beforeAfter = false`).

## SEO, нейросети и проверки (этап 6)

```bash
PATH="$HOME/.local/node/bin:$PATH" npx astro build && PATH="$HOME/.local/node/bin:$PATH" npm run -s check
```
`check` = `scripts/check-site.mjs` (noindex, один H1, title/description/canonical/OG, JSON-LD по типам страниц, «Коротко»/таблица/FAQ/дата/место врача, запрещённые слова, неподтверждённые аппараты, alt, служебные файлы) + `scripts/test-search.mjs` (10 запросов ТЗ + 3 своих) + сверка цен с прайсами.

Служебные файлы в сборке: `robots.txt` (превью: Disallow), `robots-production.txt` (для aldocoppola.ru, разрешает поисковых и ИИ-роботов), `sitemap.xml` (lastmod = дата сборки каталога), `llms.txt`, `llms-full.txt`, `ceny.json`, `search-index.json`, `.nojekyll`.
Роботы — `reports/bots.md` (`scripts/check-bots.sh`), IndexNow — `scripts/indexnow.mjs` (только боевой домен, ключ — TODO).
Цены «от» без поштучных позиций: у ботулинотерапии «от 500 ₽ за ед.»; «от» салона, направления и зоны считается без них.
Контраст: мелкий серый текст — графит 72 % (`--acc-grey-ink`, ≥ 5,3:1), #77777C — для линий и точек.

### На боевом сайте (после переноса) — TODO
- `CONFIG.preview = false`, `BASE_PATH=/kosmetologiya/`, `SITE_URL=https://aldocoppola.ru`; robots-production.txt; Вебмастер и Search Console; IndexNow.
- `sh scripts/check-bots.sh` по боевому адресу (защита Битрикса / WAF не должна резать ИИ-роботов).
- JSON-LD: дополнить `sameAs` (соцсети, Яндекс Карты, 2ГИС), `geo`, `openingHoursSpecification`, `reviewedBy` (врач) — нет данных.
- Валидатор Schema.org и Яндекс Вебмастер — по опубликованным страницам.
