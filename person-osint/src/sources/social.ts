import { PLATFORMS } from '../config.ts';
import { buildQuery, searchDuckDuckGo } from '../core/ddg.ts';
import { canonicalUrl } from '../core/html.ts';
import { detectPlatform, extractHandle, looksLikeProfileUrl, scoreHit } from '../core/score.ts';
import type { Source, SourceYield } from '../types.ts';
import { emptyYield, evidence } from './_shared.ts';

const ID = 'social';

/** Ниже этой значимости площадки запасной запрос без уточнителя не окупается. */
const BARE_QUERY_PRIOR = 0.75;

/**
 * Прицельный поиск профилей: тот же веб-поиск, но с оператором site: по каждой
 * площадке отдельно. Такой запрос вытаскивает профили, которые в общей выдаче
 * тонут под новостями и однофамильцами.
 *
 * Обходятся только публичные страницы, доступные без входа в аккаунт: обход
 * авторизации и парсинг закрытых профилей сюда не входят и не будут добавлены.
 */
export const socialProfilesSource: Source = {
  id: ID,
  name: 'Профили в соцсетях и на площадках',
  category: 'social',
  description: 'site:-запросы по LinkedIn, GitHub, VK, Telegram, X, Habr, hh.ru/hh.kz и другим',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, log, startedAt } = ctx;
    const result = emptyYield();
    const seen = new Set<string>();

    // Форма имени здесь ровно одна. Перебор всех написаний умножал число
    // запросов на каждую площадку и упирался в ограничение частоты у
    // поисковика, а разнописания и так отрабатывает стадия сопоставления.
    const form = names.queryForms[0] ?? names.original;
    const hint = target.company ?? target.city;

    for (const platform of PLATFORMS) {
      const site = platform.domains.map((d) => `site:${d}`).join(' OR ');

      // Уточнитель сужает выдачу до одного человека, но может отсечь профиль,
      // где место работы не указано. Запасной запрос без уточнителя стоит
      // отдельного обращения к поисковику только там, где личная страница
      // сама по себе что-то значит для опознания человека.
      const queries = !hint
        ? [`${buildQuery(form)} ${site}`]
        : platform.prior >= BARE_QUERY_PRIOR
          ? [`${buildQuery(form, hint)} ${site}`, `${buildQuery(form)} ${site}`]
          : [`${buildQuery(form, hint)} ${site}`];

      for (const query of queries) {
        const hits = await searchDuckDuckGo(http, query, 6, log);

        for (const hit of hits) {
          const url = canonicalUrl(hit.url);
          if (seen.has(url)) continue;
          if (!looksLikeProfileUrl(url)) continue;
          seen.add(url);

          // Ярлык берётся из самой ссылки, а не из площадки запроса: выдача по
          // site: регулярно приносит результаты с соседних доменов, и по циклу
          // запросов профиль получил бы чужую площадку.
          const actual = detectPlatform(url);
          if (!actual) continue;

          const { confidence, signals } = scoreHit(
            { url, title: hit.title, snippet: hit.snippet, sourcePrior: 0.55 },
            target,
            names,
          );
          if (confidence === 0) continue;

          result.profiles.push({
            platform: actual.platform,
            url,
            ...(extractHandle(url) ? { handle: extractHandle(url) } : {}),
            title: hit.title,
            snippet: hit.snippet,
            confidence,
            signals: [...signals, `найден точечным запросом по ${actual.label}`],
            evidence: [evidence(ID, url, startedAt, hit.title, hit.snippet)],
          });
        }

        // Профиль на площадке обычно один: нашли уверенный — запасной запрос не нужен.
        if (result.profiles.some((p) => p.platform === platform.platform && p.confidence >= 0.7)) break;
      }
    }

    return result;
  },
};
