import * as cheerio from 'cheerio';
import type { HttpLike, LoggerLike } from '../types.ts';
import { truncate } from './text.ts';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const HTML_ENDPOINT = 'https://html.duckduckgo.com/html/';
const LITE_ENDPOINT = 'https://lite.duckduckgo.com/lite/';

/**
 * Поиск через HTML-версию DuckDuckGo. Выбран как единственный крупный
 * поисковик, отдающий результаты без ключа, капчи и JavaScript.
 *
 * DuckDuckGo при перегрузке возвращает 200 с пустой выдачей, поэтому пустой
 * результат от основной вёрстки — повод попробовать lite-эндпоинт, а не признак
 * того, что ничего не найдено.
 */
export async function searchDuckDuckGo(
  http: HttpLike,
  query: string,
  limit: number,
  log: LoggerLike,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, kl: 'wt-wt' });

  for (const endpoint of [HTML_ENDPOINT, LITE_ENDPOINT]) {
    try {
      const response = await http.get(`${endpoint}?${params}`, {
        // У html.duckduckgo.com robots.txt запрещает /html/, при этом сам
        // эндпоинт публичный и предназначен для клиентов без JS. Ограничиваем
        // себя темпом запросов, а не отказом от источника.
        ignoreRobots: true,
        headers: { referer: 'https://duckduckgo.com/' },
      });
      if (!response.ok) continue;

      const { results, recognized } = endpoint === HTML_ENDPOINT
        ? parseHtmlResults(response.body)
        : parseLiteResults(response.body);

      if (results.length) {
        log.debug(`ddg «${query}» → ${results.length}`);
        return results.slice(0, limit);
      }

      // Страница разобралась, просто ничего не нашлось. Для узких site:-дорков
      // это обычный исход, и дублировать запрос на lite незачем — иначе трафик
      // удваивается на ровном месте и упирается в ограничение частоты.
      if (recognized) {
        log.debug(`ddg «${query}» → пусто`);
        return [];
      }
      log.debug(`ddg «${query}»: вёрстка не распознана, пробую lite`);
    } catch (error) {
      log.debug(`ddg «${query}» ошибка: ${(error as Error).message}`);
    }
  }

  return [];
}

/** Разобранная выдача плюс признак того, что вёрстка вообще была узнана. */
export interface ParsedSearchPage {
  results: SearchResult[];
  /** false — страница не похожа на выдачу: заглушка, капча, смена вёрстки. */
  recognized: boolean;
}

export function parseHtmlResults(html: string): ParsedSearchPage {
  const $ = cheerio.load(html);
  const out: SearchResult[] = [];

  $('.result, .web-result').each((_, el) => {
    const anchor = $(el).find('a.result__a').first();
    const href = anchor.attr('href');
    if (!href) return;
    const url = unwrapRedirect(href);
    if (!url) return;
    out.push({
      title: anchor.text().trim(),
      url,
      snippet: truncate($(el).find('.result__snippet').first().text(), 400),
    });
  });

  // Контейнер выдачи или явное «ничего не найдено» означают, что страница —
  // настоящая выдача, а не заглушка и не изменившаяся вёрстка.
  const recognized =
    out.length > 0 || $('#links').length > 0 || $('.no-results').length > 0 || $('.results').length > 0;

  return { results: out, recognized };
}

export function parseLiteResults(html: string): ParsedSearchPage {
  const $ = cheerio.load(html);
  const out: SearchResult[] = [];

  // В lite-вёрстке результат — это пара строк таблицы: ссылка и под ней сниппет.
  $('a.result-link').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const url = unwrapRedirect(href);
    if (!url) return;
    const snippet = $(el).closest('tr').next('tr').find('.result-snippet').text();
    out.push({ title: $(el).text().trim(), url, snippet: truncate(snippet, 400) });
  });

  return { results: out, recognized: out.length > 0 || $('form[action*="lite"]').length > 0 };
}

/** DuckDuckGo прячет целевой адрес в параметре uddg редиректа /l/. */
export function unwrapRedirect(href: string): string | undefined {
  try {
    const url = new URL(href, 'https://duckduckgo.com');
    if (url.pathname.startsWith('/l/')) {
      const target = url.searchParams.get('uddg');
      if (!target) return undefined;
      const decoded = new URL(decodeURIComponent(target));
      return isHttp(decoded) ? decoded.toString() : undefined;
    }
    if (url.hostname.endsWith('duckduckgo.com')) return undefined;
    return isHttp(url) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function isHttp(url: URL): boolean {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

/** Собирает поисковый запрос: имя в кавычках плюс уточнители. */
export function buildQuery(nameForm: string, ...hints: Array<string | undefined>): string {
  const parts = [`"${nameForm}"`];
  for (const hint of hints) {
    if (hint && hint.trim()) parts.push(hint.trim().includes(' ') ? `"${hint.trim()}"` : hint.trim());
  }
  return parts.join(' ');
}
