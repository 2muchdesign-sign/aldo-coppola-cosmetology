#!/bin/sh
# Проверка доступа поисковых и ИИ-роботов (ТЗ 10.1): каждый user-agent должен получить 200 и полный HTML
# (в разметке есть «Коротко», таблица цен и FAQ). Запуск: sh scripts/check-bots.sh https://aldocoppola.ru/kosmetologiya/procedury/smas-lifting-hifu/
URL="${1:?укажите адрес страницы процедуры}"
for UA in \
  "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)" \
  "Mozilla/5.0 (compatible; YandexAdditional/3.0; +http://yandex.com/bots)" \
  "Mozilla/5.0 (compatible; YandexAdditionalBot/3.0; +http://yandex.com/bots)" \
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot" \
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot" \
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot" \
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-SearchBot/1.0; +https://www.anthropic.com" \
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-User/1.0; +https://www.anthropic.com" \
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com" \
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)" \
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)" \
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)"
do
  NAME=$(echo "$UA" | grep -oE '(YandexAdditionalBot|YandexAdditional|YandexBot|Googlebot|OAI-SearchBot|ChatGPT-User|GPTBot|Claude-SearchBot|Claude-User|ClaudeBot|PerplexityBot|Perplexity-User|Applebot)' | head -1)
  OUT=$(curl -s -A "$UA" -w '\n%{http_code} %{size_download}' "$URL")
  CODE=$(echo "$OUT" | tail -1 | cut -d' ' -f1); SIZE=$(echo "$OUT" | tail -1 | cut -d' ' -f2)
  FULL=$(echo "$OUT" | grep -o -e 'acc-short' -e '<table' -e '<details' | sort -u | wc -l | tr -d ' ')
  echo "$NAME | $CODE | $SIZE байт | блоков «Коротко»/таблица/FAQ: $FULL из 3"
done
