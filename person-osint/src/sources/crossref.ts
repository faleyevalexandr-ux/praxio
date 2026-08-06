import { clamp } from '../core/score.ts';
import { nameMatchScore, truncate } from '../core/text.ts';
import type { Source, SourceYield } from '../types.ts';
import { emptyYield, evidence, tolerate } from './_shared.ts';

const ID = 'crossref';

interface CrossrefResponse {
  message?: {
    items?: Array<{
      DOI?: string;
      URL?: string;
      title?: string[];
      'container-title'?: string[];
      issued?: { 'date-parts'?: number[][] };
      author?: Array<{ given?: string; family?: string; affiliation?: Array<{ name?: string }> }>;
    }>;
  };
}

/**
 * Crossref покрывает публикации с DOI шире, чем OpenAlex, и часто содержит
 * аффилиацию автора прямо в метаданных статьи.
 */
export const crossrefSource: Source = {
  id: ID,
  name: 'Crossref (публикации по DOI)',
  category: 'academic',
  description: 'Статьи, книги и препринты с DOI, где человек указан автором',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { names, http, startedAt, maxResults } = ctx;
    const result = emptyYield();

    const query = names.queryForms[0] ?? names.original;
    const data = await tolerate(
      () =>
        http.json<CrossrefResponse>(
          `https://api.crossref.org/works?${new URLSearchParams({
            'query.author': query,
            rows: String(Math.min(maxResults, 20)),
            select: 'DOI,URL,title,container-title,issued,author',
          })}`,
        ),
      {} as CrossrefResponse,
    );

    for (const item of data.message?.items ?? []) {
      const title = item.title?.[0]?.trim();
      const url = item.DOI ? `https://doi.org/${item.DOI}` : item.URL;
      if (!title || !url) continue;

      const authors = (item.author ?? [])
        .map((a) => [a.given, a.family].filter(Boolean).join(' ').trim())
        .filter(Boolean);

      // Crossref ищет по всем полям, поэтому обязательна проверка: искомый
      // человек должен быть в списке авторов, а не просто упомянут в статье.
      const authored = authors.some((a) => nameMatchScore(a, names) >= 0.75);
      if (!authored) continue;

      const affiliations = (item.author ?? [])
        .flatMap((a) => a.affiliation ?? [])
        .map((a) => a.name)
        .filter((v): v is string => Boolean(v));

      const year = item.issued?.['date-parts']?.[0]?.[0];
      const ev = [evidence(ID, url, startedAt, title)];

      result.documents.push({
        kind: 'paper',
        title,
        url,
        ...(year ? { published: String(year) } : {}),
        authors,
        ...(item['container-title']?.[0] ? { venue: item['container-title'][0] } : {}),
        confidence: clamp(0.72),
        signals: ['человек указан в списке авторов'],
        evidence: ev,
      });

      for (const affiliation of [...new Set(affiliations)].slice(0, 3)) {
        result.facts.push({
          kind: 'employer',
          value: truncate(affiliation, 160),
          confidence: clamp(0.6),
          signals: ['аффилиация из метаданных публикации'],
          evidence: ev,
        });
      }
    }

    return result;
  },
};
