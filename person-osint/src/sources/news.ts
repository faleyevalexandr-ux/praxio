import * as cheerio from 'cheerio';
import { buildQuery } from '../core/ddg.ts';
import { clamp, scoreHit } from '../core/score.ts';
import { truncate } from '../core/text.ts';
import type { Source, SourceYield } from '../types.ts';
import { emptyYield, evidence, tolerate } from './_shared.ts';

const ID = 'news';

/**
 * Новостные упоминания через RSS-выдачу Google News: ключ не нужен, формат
 * стабильный, охват — мировая пресса на выбранном языке.
 */
export const newsSource: Source = {
  id: ID,
  name: 'Новости (Google News RSS)',
  category: 'news',
  description: 'Упоминания в прессе за всё доступное время',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, startedAt, maxResults } = ctx;
    const result = emptyYield();
    const seen = new Set<string>();

    const locales =
      target.country?.toUpperCase() === 'US'
        ? [{ hl: 'en-US', gl: 'US', ceid: 'US:en' }]
        : [
            { hl: 'ru', gl: 'RU', ceid: 'RU:ru' },
            { hl: 'en-US', gl: 'US', ceid: 'US:en' },
          ];

    const queries = names.queryForms.slice(0, 2).map((form) => buildQuery(form, target.company ?? target.city));

    for (const query of [...new Set(queries)]) {
      for (const locale of locales) {
        const url = `https://news.google.com/rss/search?${new URLSearchParams({ q: query, ...locale })}`;
        const response = await tolerate(() => http.get(url, { ignoreRobots: true }), undefined);
        if (!response?.ok) continue;

        for (const item of parseRss(response.body).slice(0, maxResults)) {
          if (seen.has(item.link)) continue;
          seen.add(item.link);

          const { confidence, signals } = scoreHit(
            { url: item.link, title: item.title, snippet: `${item.description} ${item.source}`, sourcePrior: 0.5 },
            target,
            names,
          );
          if (confidence === 0) continue;

          result.documents.push({
            kind: 'news',
            title: item.title,
            url: item.link,
            snippet: item.description,
            ...(item.pubDate ? { published: item.pubDate } : {}),
            ...(item.source ? { venue: item.source } : {}),
            confidence: clamp(confidence),
            signals,
            evidence: [evidence(ID, item.link, startedAt, item.title, item.description)],
          });
        }
      }
    }

    return result;
  },
};

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  source: string;
}

export function parseRss(xml: string): RssItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RssItem[] = [];

  $('item').each((_, el) => {
    const node = $(el);
    const link = node.find('link').first().text().trim();
    const title = node.find('title').first().text().trim();
    if (!link || !title) return;

    const rawDate = node.find('pubDate').first().text().trim();
    const parsed = rawDate ? Date.parse(rawDate) : Number.NaN;

    items.push({
      title,
      link,
      // description в Google News — HTML-обёртка, из неё нужен только текст.
      description: truncate(cheerio.load(node.find('description').first().text()).text(), 400),
      ...(Number.isFinite(parsed) ? { pubDate: new Date(parsed).toISOString() } : {}),
      source: node.find('source').first().text().trim(),
    });
  });

  return items;
}
