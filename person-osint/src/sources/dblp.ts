import { clamp, scoreHit } from '../core/score.ts';
import { nameMatchScore } from '../core/text.ts';
import type { Source, SourceYield } from '../types.ts';
import { emptyYield, evidence, tolerate } from './_shared.ts';

const ID = 'dblp';

interface DblpResponse {
  result?: {
    hits?: {
      hit?: Array<{ info?: Record<string, unknown> }>;
    };
  };
}

/**
 * DBLP — библиография по информатике. Для ИТ-специалистов из академии часто
 * единственный источник, где имя связано с конкретными конференциями и годами.
 */
export const dblpSource: Source = {
  id: ID,
  name: 'DBLP (computer science)',
  category: 'academic',
  description: 'Профили авторов и публикации по информатике',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, startedAt, maxResults } = ctx;
    const result = emptyYield();
    const query = names.queryForms[0] ?? names.original;

    const authors = await tolerate(
      () =>
        http.json<DblpResponse>(
          `https://dblp.org/search/author/api?${new URLSearchParams({ q: query, format: 'json', h: '8' })}`,
        ),
      {} as DblpResponse,
    );

    for (const hit of authors.result?.hits?.hit ?? []) {
      const info = hit.info ?? {};
      const author = str(info['author']);
      const url = str(info['url']);
      if (!author || !url || nameMatchScore(author, names) < 0.75) continue;

      const notes = collectNotes(info);
      const { confidence, signals } = scoreHit(
        { url, title: author, snippet: notes.join(', '), sourcePrior: 0.65 },
        target,
        names,
      );
      if (confidence === 0) continue;

      result.profiles.push({
        platform: 'dblp',
        url,
        displayName: author,
        title: author,
        snippet: notes.join(', '),
        confidence: clamp(confidence),
        signals,
        evidence: [evidence(ID, url, startedAt, author, notes.join(', '))],
      });
    }

    const publications = await tolerate(
      () =>
        http.json<DblpResponse>(
          `https://dblp.org/search/publ/api?${new URLSearchParams({
            q: query,
            format: 'json',
            h: String(Math.min(maxResults, 20)),
          })}`,
        ),
      {} as DblpResponse,
    );

    for (const hit of publications.result?.hits?.hit ?? []) {
      const info = hit.info ?? {};
      const title = str(info['title']);
      const url = str(info['ee']) ?? str(info['url']);
      if (!title || !url) continue;

      const authors = extractAuthors(info);
      if (!authors.some((a) => nameMatchScore(a, names) >= 0.75)) continue;

      result.documents.push({
        kind: 'paper',
        title,
        url,
        ...(str(info['year']) ? { published: str(info['year'])! } : {}),
        authors,
        ...(str(info['venue']) ? { venue: str(info['venue'])! } : {}),
        confidence: clamp(0.7),
        signals: ['человек указан в списке авторов DBLP'],
        evidence: [evidence(ID, url, startedAt, title)],
      });
    }

    return result;
  },
};

/** DBLP отдаёт одиночные значения строкой, а множественные — массивом. */
function extractAuthors(info: Record<string, unknown>): string[] {
  const container = info['authors'];
  if (!container || typeof container !== 'object') return [];
  const raw = (container as Record<string, unknown>)['author'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((item) => (typeof item === 'string' ? item : str((item as Record<string, unknown>)['text'])))
    .filter((v): v is string => Boolean(v));
}

function collectNotes(info: Record<string, unknown>): string[] {
  const notes = info['notes'];
  if (!notes || typeof notes !== 'object') return [];
  const note = (notes as Record<string, unknown>)['note'];
  const list = Array.isArray(note) ? note : note ? [note] : [];
  return list
    .map((item) => (typeof item === 'string' ? item : str((item as Record<string, unknown>)['text'])))
    .filter((v): v is string => Boolean(v));
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
