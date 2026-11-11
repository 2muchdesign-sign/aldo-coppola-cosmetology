// Сборка: статический dist/. BASE_PATH — единственный параметр пути:
// превью GitHub Pages — /aldo-coppola-cosmetology/, боевой Битрикс — /kosmetologiya/.
import { defineConfig } from 'astro/config';

const BASE_PATH = process.env.BASE_PATH || '/aldo-coppola-cosmetology/';
const SITE = process.env.SITE_URL || 'https://2muchdesign-sign.github.io';

export default defineConfig({
  site: SITE,
  base: BASE_PATH,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', assets: 'acc-assets', inlineStylesheets: 'never' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
