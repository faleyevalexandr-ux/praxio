import type { DocumentHit, Fact, ProfileHit } from '../types.ts';
import { canonicalUrl } from './html.ts';
import { profileIdentityUrl } from './score.ts';
import { normalize } from './text.ts';

/**
 * Один и тот же профиль приходит из нескольких источников. Слияние идёт по
 * канонизированному URL: уверенность берётся максимальная, а доказательства
 * складываются — независимое подтверждение двумя источниками ценнее одного.
 */
export function mergeProfiles(hits: ProfileHit[]): ProfileHit[] {
  const byKey = new Map<string, ProfileHit>();

  for (const hit of hits) {
    const identity = profileIdentityUrl(hit.url);
    const key = `${hit.platform}::${identity.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...hit, url: identity });
      continue;
    }
    byKey.set(key, {
      ...existing,
      displayName: existing.displayName ?? hit.displayName,
      handle: existing.handle ?? hit.handle,
      title: existing.title ?? hit.title,
      snippet: existing.snippet ?? hit.snippet,
      confidence: corroborate(existing.confidence, hit.confidence, distinctSources(existing, hit)),
      signals: unique([...existing.signals, ...hit.signals]),
      evidence: dedupeEvidence([...existing.evidence, ...hit.evidence]),
    });
  }

  return [...byKey.values()].sort((a, b) => b.confidence - a.confidence);
}

export function mergeDocuments(hits: DocumentHit[]): DocumentHit[] {
  const byKey = new Map<string, DocumentHit>();

  for (const hit of hits) {
    // DOI и один и тот же препринт живут по разным URL, поэтому ключ —
    // канонический адрес или, если он не помог, нормализованный заголовок.
    const key = canonicalUrl(hit.url).toLowerCase() || `title::${normalize(hit.title)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...hit, url: canonicalUrl(hit.url) });
      continue;
    }
    byKey.set(key, {
      ...existing,
      snippet: existing.snippet ?? hit.snippet,
      published: existing.published ?? hit.published,
      venue: existing.venue ?? hit.venue,
      authors: existing.authors?.length ? existing.authors : hit.authors,
      confidence: corroborate(existing.confidence, hit.confidence, distinctSources(existing, hit)),
      signals: unique([...existing.signals, ...hit.signals]),
      evidence: dedupeEvidence([...existing.evidence, ...hit.evidence]),
    });
  }

  const seenTitles = new Map<string, DocumentHit>();
  for (const hit of byKey.values()) {
    const titleKey = normalize(hit.title);
    if (!titleKey) continue;
    const existing = seenTitles.get(titleKey);
    if (!existing || hit.confidence > existing.confidence) seenTitles.set(titleKey, hit);
  }

  return [...seenTitles.values()].sort((a, b) => b.confidence - a.confidence);
}

export function mergeFacts(facts: Fact[]): Fact[] {
  const byKey = new Map<string, Fact>();

  for (const fact of facts) {
    const key = `${fact.kind}::${normalize(fact.value)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, fact);
      continue;
    }
    byKey.set(key, {
      ...existing,
      confidence: corroborate(existing.confidence, fact.confidence, distinctSources(existing, fact)),
      signals: unique([...existing.signals, ...fact.signals]),
      evidence: dedupeEvidence([...existing.evidence, ...fact.evidence]),
    });
  }

  return [...byKey.values()].sort(
    (a, b) => b.confidence - a.confidence || a.kind.localeCompare(b.kind),
  );
}

/**
 * Подтверждение из независимого источника повышает уверенность, но не
 * линейно — три перепечатки одной новости не делают факт втрое достовернее.
 */
function corroborate(a: number, b: number, independent: boolean): number {
  const best = Math.max(a, b);
  if (!independent) return best;
  return Math.min(1, best + (1 - best) * 0.35);
}

function distinctSources(a: { evidence: { sourceId: string }[] }, b: { evidence: { sourceId: string }[] }): boolean {
  const left = new Set(a.evidence.map((e) => e.sourceId));
  return b.evidence.some((e) => !left.has(e.sourceId));
}

function dedupeEvidence<T extends { sourceId: string; url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = `${item.sourceId}::${canonicalUrl(item.url).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
