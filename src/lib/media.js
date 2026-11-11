// Медиа по ключам блоков (как объект MEDIA в «Топ-стилисте»). Источник — data/media.yaml,
// обработанные файлы и размеры — src/lib/media-manifest.json (scripts/media/process-media.mjs).
// Пока файла нет — карусель показывает заглушку с подсказкой, какой кадр нужен (HINTS).
import { u } from './data.js';
import manifest from './media-manifest.json';

const m = p => u('media/' + p);

/** Фото из манифеста → элемент для <picture>: srcset WebP, запасной JPG, полный кадр для лайтбокса */
function photo(it) {
  return {
    src: m(`${it.base}-${it.jpg.includes(1024) ? 1024 : it.jpg[0]}.jpg`),
    srcsetJpg: it.jpg.map(w => `${m(`${it.base}-${w}.jpg`)} ${w}w`).join(', '),
    srcsetWebp: it.webp.map(w => `${m(`${it.base}-${w}.webp`)} ${w}w`).join(', '),
    full: m(`${it.base}-${it.webp.at(-1)}.webp`),
    thumb: m(`${it.base}-${it.webp[0]}.webp`),
    ratio: it.ratio, alt: it.alt, caption: it.caption,
  };
}
function video(v) {
  const p = photo(v.poster);
  return { video: m(v.video), mobile: v.mobile ? m(v.mobile) : null, poster: p.src, posterWebp: p.full, alt: v.alt, caption: v.alt, seconds: v.seconds };
}

export const MEDIA = {};
for (const [k, list] of Object.entries(manifest.images)) MEDIA[k] = list.map(photo);
for (const [k, v] of Object.entries(manifest.videos)) MEDIA[k] = [video(v)];

/** Подсказки съёмки для заглушек (TODO: материалы заказчика — список в README) */
export const HINTS = {
  procedure: (name, devs) => [
    { kind: 'Видео 10–15 с', hint: devs ? `${devs} в кабинете, процедура крупно` : `${name}: процедура в кабинете` },
    { kind: 'Фото 4:5', hint: 'Руки врача, подготовка процедуры' },
    { kind: 'Фото 4:5', hint: 'Кабинет косметологии, общий план' },
  ],
  device: name => [{ kind: 'Видео 10–15 с', hint: `Аппарат ${name} в кабинете` }, { kind: 'Фото 4:5', hint: `${name}: манипула крупно` }],
  goal: name => [{ kind: 'Видео 10 с', hint: `${name}: макро кожи, мягкий свет` }],
};

export const media = key => MEDIA[key] || [];
/** Медиа процедуры: свои кадры + заглушки до 3 */
export const procedureMedia = (p, devNames) => {
  const own = MEDIA[`procedure-${p.slug}`] || [];
  return [...own, ...HINTS.procedure(p.name, devNames).slice(own.length ? 1 : 0)].slice(0, 3);
};
export const deviceMedia = d => [...(MEDIA[`device-${d.slug}`] || []), ...HINTS.device(d.name)].slice(0, 3);
export const salonCover = slug => MEDIA[`salon-${slug}`]?.find(x => /Кабинет/.test(x.caption || '')) || MEDIA[`salon-${slug}`]?.[0];
