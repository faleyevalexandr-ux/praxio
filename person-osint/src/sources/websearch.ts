import { buildQuery, searchDuckDuckGo } from '../core/ddg.ts';
import { canonicalUrl } from '../core/html.ts';
import { detectPlatform, extractHandle, looksLikeProfileUrl, scoreHit } from '../core/score.ts';
import type { DocumentHit, ProfileHit, Source, SourceYield } from '../types.ts';
import { emptyYield, evidence } from './_shared.ts';

const ID = 'websearch';

/**
 * Обычный веб-поиск по имени с уточнителями. Даёт самый широкий охват и
 * одновременно самый шумный результат, поэтому каждая находка проходит скоринг.
 */
export const webSearchSource: Source = {
  id: ID,
  name: 'Веб-поиск (DuckDuckGo)',
  category: 'search',
  description: 'Открытый веб-поиск по имени в сочетании с городом и организацией',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, log, startedAt } = ctx;
    const result = emptyYield();
    const seen = new Set<string>();

    // Запросы идут от самого специфичного к самому общему: если уточнители
    // дали результат, широкий запрос нужен лишь для добора.
    const queries: string[] = [];
    for (const form of names.queryForms.slice(0, 4)) {
      if (target.company) queries.push(buildQuery(form, target.company));
      if (target.city) queries.push(buildQuery(form, target.city));
      if (target.company && target.city) queries.push(buildQuery(form, target.company, target.city));
    }
    for (const form of names.queryForms.slice(0, 2)) {
      queries.push(buildQuery(form, ...target.keywords));
    }

    const perQuery = Math.max(5, Math.ceil(ctx.maxResults / 2));

    for (const query of dedupe(queries).slice(0, 8)) {
      const hits = await searchDuckDuckGo(http, query, perQuery, log);

      for (const hit of hits) {
        const url = canonicalUrl(hit.url);
        if (seen.has(url)) continue;
        seen.add(url);

        const { confidence, signals } = scoreHit(
          { url, title: hit.title, snippet: hit.snippet, sourcePrior: 0.45 },
          target,
          names,
        );
        if (confidence === 0) continue;

        const ev = [evidence(ID, url, startedAt, hit.title, hit.snippet)];
        const platform = detectPlatform(url);

        if (platform && looksLikeProfileUrl(url)) {
          const profile: ProfileHit = {
            platform: platform.platform,
            url,
            ...(extractHandle(url) ? { handle: extractHandle(url) } : {}),
            title: hit.title,
            snippet: hit.snippet,
            confidence,
            signals: [...signals, `запрос: ${query}`],
            evidence: ev,
          };
          result.profiles.push(profile);
        } else {
          const document: DocumentHit = {
            kind: 'page',
            title: hit.title || url,
            url,
            snippet: hit.snippet,
            confidence,
            signals: [...signals, `запрос: ${query}`],
            evidence: ev,
          };
          result.documents.push(document);
        }
      }

      if (result.profiles.length + result.documents.length >= ctx.maxResults * 2) break;
    }

    return result;
  },
};

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
