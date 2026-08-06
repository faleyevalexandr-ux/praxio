import { clamp, scoreHit } from '../core/score.ts';
import { nameMatchScore, truncate } from '../core/text.ts';
import type { Source, SourceYield } from '../types.ts';
import { emptyYield, evidence, tolerate } from './_shared.ts';

const ID = 'openalex';
const API = 'https://api.openalex.org';

interface AuthorsResponse {
  results?: Array<{
    id?: string;
    display_name?: string;
    works_count?: number;
    cited_by_count?: number;
    orcid?: string | null;
    last_known_institutions?: Array<{ display_name?: string; country_code?: string }>;
    affiliations?: Array<{ institution?: { display_name?: string }; years?: number[] }>;
    topics?: Array<{ display_name?: string }>;
  }>;
}

interface WorksResponse {
  results?: Array<{
    id?: string;
    doi?: string | null;
    title?: string | null;
    publication_year?: number;
    primary_location?: { source?: { display_name?: string } | null; landing_page_url?: string | null };
    authorships?: Array<{ author?: { display_name?: string } }>;
  }>;
}

/**
 * OpenAlex — открытый каталог научных публикаций и авторов. Для людей с
 * академическим следом даёт то, чего не даст веб-поиск: аффилиацию, ORCID и
 * полный список работ.
 */
export const openAlexSource: Source = {
  id: ID,
  name: 'OpenAlex (научные публикации)',
  category: 'academic',
  description: 'Авторские профили, аффилиации и публикации из открытого научного каталога',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, startedAt, maxResults } = ctx;
    const result = emptyYield();

    const query = names.queryForms[0] ?? names.original;
    const authors = await tolerate(
      () =>
        http.json<AuthorsResponse>(
          `${API}/authors?${new URLSearchParams({ search: query, per_page: '8' })}`,
        ),
      {} as AuthorsResponse,
    );

    for (const author of (authors.results ?? []).slice(0, 5)) {
      const displayName = author.display_name ?? '';
      if (!author.id || nameMatchScore(displayName, names) < 0.75) continue;

      const institutions = [
        ...(author.last_known_institutions ?? []).map((i) => i.display_name),
        ...(author.affiliations ?? []).map((a) => a.institution?.display_name),
      ].filter((v): v is string => Boolean(v));

      const topics = (author.topics ?? []).map((t) => t.display_name).filter(Boolean).slice(0, 5);
      const context = [displayName, ...institutions, ...topics].join(', ');
      const profileUrl = author.id.replace('https://openalex.org/', 'https://openalex.org/');

      const { confidence, signals } = scoreHit(
        { url: profileUrl, title: displayName, snippet: context, sourcePrior: 0.7 },
        target,
        names,
      );
      if (confidence === 0) continue;

      const ev = [evidence(ID, profileUrl, startedAt, displayName, truncate(context, 300))];

      result.profiles.push({
        platform: 'openalex',
        url: profileUrl,
        displayName,
        title: displayName,
        snippet: truncate(context, 300),
        confidence: clamp(confidence),
        signals: [...signals, `публикаций: ${author.works_count ?? 0}`],
        evidence: ev,
      });

      for (const institution of unique(institutions).slice(0, 4)) {
        result.facts.push({
          kind: 'employer',
          value: institution,
          confidence: clamp(confidence),
          signals: [...signals, 'аффилиация по публикациям'],
          evidence: ev,
        });
      }

      if (topics.length) {
        result.facts.push({
          kind: 'bio',
          value: `Научные темы: ${topics.join(', ')}`,
          confidence: clamp(confidence - 0.05),
          signals,
          evidence: ev,
        });
      }

      if (author.orcid) {
        result.facts.push({
          kind: 'identifier',
          value: `ORCID: ${author.orcid.replace('https://orcid.org/', '')}`,
          confidence: clamp(confidence + 0.1),
          signals: [...signals, 'постоянный идентификатор исследователя'],
          evidence: ev,
        });
        result.profiles.push({
          platform: 'orcid',
          url: author.orcid,
          displayName,
          confidence: clamp(confidence + 0.1),
          signals: [...signals, 'ORCID из OpenAlex'],
          evidence: ev,
        });
      }

      const works = await tolerate(
        () =>
          http.json<WorksResponse>(
            `${API}/works?${new URLSearchParams({
              filter: `author.id:${author.id}`,
              per_page: String(Math.min(maxResults, 25)),
              sort: 'cited_by_count:desc',
            })}`,
          ),
        {} as WorksResponse,
      );

      for (const work of works.results ?? []) {
        const title = work.title?.trim();
        if (!title) continue;
        const url = work.doi ?? work.primary_location?.landing_page_url ?? work.id;
        if (!url) continue;

        result.documents.push({
          kind: 'paper',
          title,
          url,
          ...(work.publication_year ? { published: String(work.publication_year) } : {}),
          authors: (work.authorships ?? []).map((a) => a.author?.display_name).filter((v): v is string => Boolean(v)),
          ...(work.primary_location?.source?.display_name
            ? { venue: work.primary_location.source.display_name }
            : {}),
          // Работа привязана к автору идентификатором, а не совпадением строк,
          // поэтому уверенность наследуется от профиля автора без штрафа.
          confidence: clamp(confidence),
          signals: ['публикация связана с профилем автора в OpenAlex'],
          evidence: [evidence(ID, url, startedAt, title)],
        });
      }
    }

    return result;
  },
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
