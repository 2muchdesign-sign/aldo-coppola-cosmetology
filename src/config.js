// Настройки сайта. На клиенте доступны как window.ACC.config (только безопасные поля).
export const CONFIG = {
  preview: true,               // превью: noindex, nofollow на всех страницах + robots.txt Disallow
  standaloneChrome: true,      // своя шапка и подвал; false — когда страница встанет в шаблон Битрикса
  beforeAfter: false,          // фото «до/после» — выключено до согласования с юристом
  whatsapp: null,              // TODO: номер WhatsApp для записи и вопросов (формат 79XXXXXXXXX)
  metrika: null,               // TODO: ID Яндекс Метрики
  license: null,               // TODO: реквизиты медицинской лицензии
  legalEntity: null,           // TODO: юрлицо
  blog: 'https://aldocoppola.ru/', // блог — заглушка ссылок до получения статей
  brandSince: 1996,            // с 1996 года в России (брендбук)
};
