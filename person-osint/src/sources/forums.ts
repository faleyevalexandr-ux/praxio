import { clamp, scoreHit } from '../core/score.ts';
import { nameMatchScore, truncate } from '../core/text.ts';
import type { Source, SourceYield } from '../types.ts';
import { emptyYield, evidence, tolerate } from './_shared.ts';

interface HnResponse {
  hits?: Array<{
    objectID?: string;
    title?: string | null;
    story_title?: string | null;
    url?: string | null;
    author?: string;
    created_at?: string;
    story_text?: string | null;
    comment_text?: string | null;
  }>;
}

/**
 * Hacker News через открытый индекс Algolia. Профессиональные обсуждения и
 * анонсы, в которых человека упоминают по имени.
 */
export const hackerNewsSource: Source = {
  id: 'hackernews',
  name: 'Hacker News',
  category: 'forum',
  description: 'Упоминания в постах и обсуждениях Hacker News',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, startedAt, maxResults } = ctx;
    const result = emptyYield();
    const query = names.queryForms[0] ?? names.original;

    const data = await tolerate(
      () =>
        http.json<HnResponse>(
          `https://hn.algolia.com/api/v1/search?${new URLSearchParams({
            query,
            tags: 'story',
            hitsPerPage: String(Math.min(maxResults, 20)),
          })}`,
        ),
      {} as HnResponse,
    );

    for (const hit of data.hits ?? []) {
      const title = (hit.title ?? hit.story_title ?? '').trim();
      if (!title || !hit.objectID) continue;

      const discussion = `https://news.ycombinator.com/item?id=${hit.objectID}`;
      const url = hit.url ?? discussion;
      const body = truncate(`${hit.story_text ?? ''} ${hit.comment_text ?? ''}`, 400);

      const { confidence, signals } = scoreHit(
        { url, title, snippet: body, sourcePrior: 0.4 },
        target,
        names,
      );
      if (confidence === 0) continue;

      result.documents.push({
        kind: 'post',
        title,
        url,
        snippet: body || undefined,
        ...(hit.created_at ? { published: hit.created_at } : {}),
        confidence: clamp(confidence),
        signals: [...signals, `обсуждение: ${discussion}`],
        evidence: [evidence('hackernews', discussion, startedAt, title, body)],
      });
    }

    return result;
  },
};

interface StackExchangeResponse {
  items?: Array<{
    user_id?: number;
    display_name?: string;
    link?: string;
    location?: string;
    website_url?: string;
    reputation?: number;
    about_me?: string;
  }>;
}

/**
 * Stack Overflow отдаёт публичные профили без ключа (квота ~300 запросов в
 * сутки на IP). Поля «location» и «website» заполняет сам пользователь.
 */
export const stackExchangeSource: Source = {
  id: 'stackexchange',
  name: 'Stack Overflow',
  category: 'forum',
  description: 'Публичные профили: город, личный сайт, описание',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, startedAt } = ctx;
    const result = emptyYield();
    const query = names.queryForms[0] ?? names.original;

    const data = await tolerate(
      () =>
        http.json<StackExchangeResponse>(
          `https://api.stackexchange.com/2.3/users?${new URLSearchParams({
            inname: query,
            site: 'stackoverflow',
            pagesize: '10',
            filter: '!LnNkvq0d-S)tRODzHt',
          })}`,
        ),
      {} as StackExchangeResponse,
    );

    for (const item of data.items ?? []) {
      const link = item.link;
      const displayName = item.display_name ?? '';
      if (!link || nameMatchScore(displayName, names) < 0.75) continue;

      const context = [item.location, item.about_me, item.website_url].filter(Boolean).join(' · ');
      const { confidence, signals } = scoreHit(
        { url: link, title: displayName, snippet: context, sourcePrior: 0.5 },
        target,
        names,
      );
      if (confidence === 0) continue;

      const ev = [evidence('stackexchange', link, startedAt, displayName, truncate(context, 300))];

      result.profiles.push({
        platform: 'stackoverflow',
        url: link,
        displayName,
        title: displayName,
        snippet: truncate(context, 300),
        confidence: clamp(confidence),
        signals: [...signals, `репутация: ${item.reputation ?? 0}`],
        evidence: ev,
      });

      if (item.location) {
        result.facts.push({
          kind: 'location',
          value: item.location,
          confidence: clamp(confidence),
          signals: [...signals, 'город указан в профиле Stack Overflow'],
          evidence: ev,
        });
      }
      if (item.website_url) {
        result.facts.push({
          kind: 'website',
          value: item.website_url,
          confidence: clamp(confidence),
          signals: [...signals, 'сайт указан в профиле Stack Overflow'],
          evidence: ev,
        });
      }
    }

    return result;
  },
};
