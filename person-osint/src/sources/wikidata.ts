import { clamp, scoreHit } from '../core/score.ts';
import { nameMatchScore } from '../core/text.ts';
import type { Fact, FactKind, Source, SourceYield } from '../types.ts';
import { emptyYield, evidence, tolerate } from './_shared.ts';

const ID = 'wikidata';
const API = 'https://www.wikidata.org/w/api.php';

/** Свойства Wikidata, из которых собираются факты о человеке. */
const CLAIM_MAP: Array<{ property: string; kind: FactKind; label: string }> = [
  { property: 'P106', kind: 'jobTitle', label: 'род занятий' },
  { property: 'P108', kind: 'employer', label: 'работодатель' },
  { property: 'P69', kind: 'education', label: 'учебное заведение' },
  { property: 'P19', kind: 'location', label: 'место рождения' },
  { property: 'P27', kind: 'location', label: 'гражданство' },
  { property: 'P937', kind: 'location', label: 'место работы' },
];

interface SearchResponse {
  search?: Array<{ id: string; label?: string; description?: string; concepturi?: string }>;
}

interface EntitiesResponse {
  entities?: Record<string, WikidataEntity>;
}

interface WikidataEntity {
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  aliases?: Record<string, Array<{ value: string }>>;
  claims?: Record<string, Array<{ mainsnak?: Snak }>>;
  sitelinks?: Record<string, { title: string; url?: string }>;
}

interface Snak {
  datatype?: string;
  datavalue?: { type?: string; value?: unknown };
}

/**
 * Wikidata покрывает только публичных людей, зато данные структурированы и
 * связаны с Википедией — это самый качественный бесплатный источник фактов.
 */
export const wikidataSource: Source = {
  id: ID,
  name: 'Wikidata / Википедия',
  category: 'encyclopedia',
  description: 'Структурированные данные о публичных персонах и ссылки на статьи',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, startedAt } = ctx;
    const result = emptyYield();

    const languages = target.country?.toUpperCase() === 'RU' ? ['ru', 'en'] : ['en', 'ru'];
    const candidates = new Map<string, { label: string; description: string }>();

    for (const form of names.queryForms.slice(0, 3)) {
      for (const language of languages) {
        const url = `${API}?${new URLSearchParams({
          action: 'wbsearchentities',
          search: form,
          language,
          uselang: language,
          type: 'item',
          limit: '8',
          format: 'json',
          origin: '*',
        })}`;

        const data = await tolerate(() => http.json<SearchResponse>(url), {} as SearchResponse);
        for (const item of data.search ?? []) {
          if (!candidates.has(item.id)) {
            candidates.set(item.id, { label: item.label ?? '', description: item.description ?? '' });
          }
        }
      }
    }

    if (candidates.size === 0) return result;

    const ids = [...candidates.keys()].slice(0, 12);
    const entities = await tolerate(
      () =>
        http.json<EntitiesResponse>(
          `${API}?${new URLSearchParams({
            action: 'wbgetentities',
            ids: ids.join('|'),
            props: 'labels|descriptions|aliases|claims|sitelinks/urls',
            languages: 'ru|en',
            format: 'json',
            origin: '*',
          })}`,
        ),
      {} as EntitiesResponse,
    );

    // Отбираем только людей (P31 = Q5) и только тех, чьё имя реально совпало.
    const humans: Array<{ id: string; entity: WikidataEntity; confidence: number; signals: string[] }> = [];

    for (const [id, entity] of Object.entries(entities.entities ?? {})) {
      if (!isHuman(entity)) continue;
      const label = pickLanguage(entity.labels) ?? candidates.get(id)?.label ?? '';
      const description = pickLanguage(entity.descriptions) ?? candidates.get(id)?.description ?? '';
      if (nameMatchScore(label, names) < 0.75) continue;

      const entityUrl = `https://www.wikidata.org/wiki/${id}`;
      const { confidence, signals } = scoreHit(
        { url: entityUrl, title: label, snippet: description, sourcePrior: 0.8 },
        target,
        names,
      );
      if (confidence === 0) continue;
      humans.push({ id, entity, confidence, signals });
    }

    if (humans.length === 0) return result;

    // Метки связанных сущностей (профессия, работодатель) приходят как QID —
    // разворачиваем их одним запросом, иначе в отчёте будет «Q42» вместо текста.
    const referenced = new Set<string>();
    for (const { entity } of humans) {
      for (const { property } of CLAIM_MAP) {
        for (const qid of claimEntityIds(entity, property)) referenced.add(qid);
      }
    }

    const labelMap = await resolveLabels(http, [...referenced]);

    for (const { id, entity, confidence, signals } of humans.slice(0, 5)) {
      const entityUrl = `https://www.wikidata.org/wiki/${id}`;
      const label = pickLanguage(entity.labels) ?? '';
      const description = pickLanguage(entity.descriptions) ?? '';
      const ev = [evidence(ID, entityUrl, startedAt, label, description)];

      const push = (kind: FactKind, value: string, extraSignals: string[] = []) => {
        if (!value) return;
        const fact: Fact = {
          kind,
          value,
          confidence: clamp(confidence),
          signals: [...signals, ...extraSignals],
          evidence: ev,
        };
        result.facts.push(fact);
      };

      if (description) push('bio', description, ['описание Wikidata']);
      push('identifier', `Wikidata: ${id}`);

      for (const { property, kind, label: propertyLabel } of CLAIM_MAP) {
        for (const qid of claimEntityIds(entity, property)) {
          const value = labelMap.get(qid);
          if (value) push(kind, value, [propertyLabel]);
        }
      }

      const birth = claimTime(entity, 'P569');
      if (birth) push('birthDate', birth, ['дата рождения']);

      for (const site of claimStrings(entity, 'P856')) push('website', site, ['официальный сайт']);

      for (const alias of entity.aliases?.['ru'] ?? []) push('alias', alias.value, ['псевдоним']);
      for (const alias of entity.aliases?.['en'] ?? []) push('alias', alias.value, ['псевдоним']);

      // Статьи в Википедии — самостоятельные документы, а не просто ссылки.
      for (const [key, link] of Object.entries(entity.sitelinks ?? {})) {
        if (!/^(ru|en)wiki$/.test(key) || !link.url) continue;
        result.documents.push({
          kind: 'page',
          title: link.title,
          url: link.url,
          snippet: description,
          confidence: clamp(confidence + 0.05),
          signals: [...signals, 'статья в Википедии'],
          evidence: [evidence(ID, link.url, startedAt, link.title, description)],
        });
      }

      result.profiles.push({
        platform: 'wikidata',
        url: entityUrl,
        displayName: label,
        title: label,
        snippet: description,
        confidence: clamp(confidence),
        signals,
        evidence: ev,
      });
    }

    return result;
  },
};

async function resolveLabels(
  http: { json<T>(url: string): Promise<T> },
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // API принимает не более 50 идентификаторов за запрос.
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    if (batch.length === 0) continue;
    const data = await tolerate(
      () =>
        http.json<EntitiesResponse>(
          `${API}?${new URLSearchParams({
            action: 'wbgetentities',
            ids: batch.join('|'),
            props: 'labels',
            languages: 'ru|en',
            format: 'json',
            origin: '*',
          })}`,
        ),
      {} as EntitiesResponse,
    );
    for (const [id, entity] of Object.entries(data.entities ?? {})) {
      const label = pickLanguage(entity.labels);
      if (label) map.set(id, label);
    }
  }
  return map;
}

function isHuman(entity: WikidataEntity): boolean {
  return claimEntityIds(entity, 'P31').includes('Q5');
}

function claimEntityIds(entity: WikidataEntity, property: string): string[] {
  const out: string[] = [];
  for (const claim of entity.claims?.[property] ?? []) {
    const value = claim.mainsnak?.datavalue?.value;
    if (value && typeof value === 'object' && 'id' in value) {
      out.push(String((value as { id: unknown }).id));
    }
  }
  return out;
}

function claimStrings(entity: WikidataEntity, property: string): string[] {
  const out: string[] = [];
  for (const claim of entity.claims?.[property] ?? []) {
    const value = claim.mainsnak?.datavalue?.value;
    if (typeof value === 'string') out.push(value);
  }
  return out;
}

function claimTime(entity: WikidataEntity, property: string): string | undefined {
  for (const claim of entity.claims?.[property] ?? []) {
    const value = claim.mainsnak?.datavalue?.value;
    if (value && typeof value === 'object' && 'time' in value) {
      // Формат Wikidata: «+1980-05-17T00:00:00Z».
      const time = String((value as { time: unknown }).time);
      const match = /^[+-](\d{4})-(\d{2})-(\d{2})/.exec(time);
      if (match) {
        const [, year, month, day] = match;
        return month === '00' ? year! : `${year}-${month}-${day === '00' ? '01' : day}`;
      }
    }
  }
  return undefined;
}

function pickLanguage(record: Record<string, { value: string }> | undefined): string | undefined {
  return record?.['ru']?.value ?? record?.['en']?.value;
}
