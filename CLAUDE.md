# Сайт косметологии Aldo Coppola

Полное ТЗ — в `TZ.md` рядом с этим файлом. Прочитай его целиком перед работой.

Коротко:
- Многостраничный каталог косметологии сети Aldo Coppola: поиск по проблеме, зоне, процедуре, аппарату и салону; цены и запись (YClients, позже 1С).
- Цены — только из прайсов YClients: `~/Downloads/Work Claude/13 Прайс листы/Прайс листы всех салонов для YClients_nov2026/`.
- Дизайн — своя концепция «Клиническая точность × итальянский стиль» (ТЗ, раздел 8; макеты: https://claude.ai/artifact/4dcSoFd62yL2WbaNyqd87R): только цвета бренда (#FFFFFF, #F4F4F5, #2E2E30, #77777C, #C8102E — красный только как метка), шрифты Onest + IBM Plex Mono + курсив Cormorant в одном слове, паспорт процедуры, индикатор салонов, схема зон, поиск-палитра.
- Из `../aldo-coppola-top-stylist-v2/` берём только технику (карусели, лайтбокс, видео, MEDIA, публикация), не его стиль.
- Сборка — Astro, статический `dist/`, CSS в пространстве `.acc-` (страница потом встанет в Битрикс в `aldocoppola.ru/kosmetologiya/`).
- Публикация — GitHub Pages, репозиторий `aldo-coppola-cosmetology` (аккаунт как у top-stylist-v2), превью с `noindex`.
- Названия салонов: Жуковка, Барвиха, БЦ ВЭБ РФ, ТЦ Времена года, ТЦ BoscoVesna, Юнимолл, Лотте Отель. Только «клиент», не «гость».
- Ничего не выдумывать; нет данных — `TODO` и строка в README.

## Решения заказчика и ход работ
- 11.11.2026 — этап 1 (данные) подтверждён. «Ничего из процедур не удалять, всё ставить; цены — как в прайсе, поправим позже»: скрыт только Лотте Отель (по ТЗ), всё остальное показывается. Адреса, телефоны, ссылки YClients — от заказчика (в `data/salons.yaml`).
- Боевой адрес раздела — `aldocoppola.ru/kosmetologiya/` (BASE_PATH `/kosmetologiya/`).
- 11.11.2026 — этап 2 (дизайн-основа) — тестовая страница `/dizayn/`.
- 11.11.2026 — этап 6 (SEO): sitemap, robots (превью + production), llms.txt, ceny.json, IndexNow, reports/bots.md; автотесты `npm run -s check`. Ранжирование поиска — runSearch в search-core.js (общий для сайта и теста). Мелкий серый текст — --acc-grey-ink (контраст AA).
- 11.11.2026 — этап 5 (медиа): data/media.yaml + scripts/media/process-media.mjs (sharp, ffmpeg-static) → public/media/img|video, манифест src/lib/media-manifest.json; компонент Picture.
- 11.11.2026 — этап 4: схема зон (компонент ZoneMap, координаты в zones.yaml) и мастер `/podbor/` (правила data/podbor.yaml, скрипт src/scripts/podbor.js). Зоны процедуры = зоны из прайса + зоны её целей.
- 11.11.2026 — этап 3 (шаблоны): хаб, процедура, направления, зоны, цели, аппараты, салоны, прайс — 144 страницы. WhatsApp = мобильные номера салонов (решение заказчика). ID филиалов YClients в salons.yaml.

## Как работать
- Node.js 22 стоит локально в `~/.local/node` (не в PATH): `PATH="$HOME/.local/node/bin:$PATH" npx astro build`.
- Python для каталога — `.venv` (`xlrd`, `pyyaml`): `npm run catalog` = сборка catalog.json + сверка цен.
- Превью в панели браузера: dev-сервер не читает «Загрузки», поэтому `dist/` копируется в scratchpad и раздаётся WEBrick (конфиг `acc-dev` в `../.claude/launch.json`).
- Код: `src/lib/data.js` (каталог), `src/scripts/acc.js` (клиент, только `window.ACC`), `src/scripts/search-core.js` (поиск), `src/styles/acc.css` (всё в `.acc-root`, сбросы через `:where()`).
