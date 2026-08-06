import type { Source } from '../types.ts';
import { crossrefSource } from './crossref.ts';
import { dblpSource } from './dblp.ts';
import { hackerNewsSource, stackExchangeSource } from './forums.ts';
import { githubSource } from './github.ts';
import { newsSource } from './news.ts';
import { openAlexSource } from './openalex.ts';
import { orcidSource } from './orcid.ts';
import { socialProfilesSource } from './social.ts';
import { webSearchSource } from './websearch.ts';
import { wikidataSource } from './wikidata.ts';

/** Порядок влияет только на вывод `person-osint sources`; запуск параллельный. */
export const ALL_SOURCES: Source[] = [
  webSearchSource,
  socialProfilesSource,
  wikidataSource,
  githubSource,
  openAlexSource,
  orcidSource,
  crossrefSource,
  dblpSource,
  newsSource,
  hackerNewsSource,
  stackExchangeSource,
];

export function selectSources(options: { only?: string[]; skip?: string[] }): Source[] {
  let sources = ALL_SOURCES;
  if (options.only?.length) {
    const wanted = new Set(options.only.map((id) => id.trim().toLowerCase()));
    sources = sources.filter((s) => wanted.has(s.id));
  }
  if (options.skip?.length) {
    const unwanted = new Set(options.skip.map((id) => id.trim().toLowerCase()));
    sources = sources.filter((s) => !unwanted.has(s.id));
  }
  return sources;
}

export function unknownSourceIds(ids: string[]): string[] {
  const known = new Set(ALL_SOURCES.map((s) => s.id));
  return ids.map((id) => id.trim().toLowerCase()).filter((id) => id && !known.has(id));
}
