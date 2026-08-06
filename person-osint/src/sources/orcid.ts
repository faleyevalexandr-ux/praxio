import { clamp, scoreHit } from '../core/score.ts';
import { nameMatchScore } from '../core/text.ts';
import type { Source, SourceYield } from '../types.ts';
import { emptyYield, evidence, tolerate } from './_shared.ts';

const ID = 'orcid';

interface OrcidResponse {
  'expanded-result'?: Array<{
    'orcid-id'?: string;
    'given-names'?: string;
    'family-names'?: string;
    'credit-name'?: string;
    'institution-name'?: string[];
    'email'?: string[];
  }> | null;
}

/**
 * ORCID — реестр идентификаторов исследователей. Ценность в том, что запись
 * заводит и подтверждает сам человек: это самоподтверждённые данные, а не
 * догадка алгоритма.
 */
export const orcidSource: Source = {
  id: ID,
  name: 'ORCID',
  category: 'academic',
  description: 'Идентификаторы исследователей и заявленные ими места работы',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, startedAt } = ctx;
    const result = emptyYield();

    const query = names.given && names.surname
      ? `given-names:${quote(names.given)} AND family-name:${quote(names.surname)}`
      : quote(names.original);

    const data = await tolerate(
      () =>
        http.json<OrcidResponse>(
          `https://pub.orcid.org/v3.0/expanded-search/?${new URLSearchParams({ q: query, rows: '10' })}`,
          { headers: { accept: 'application/json' } },
        ),
      {} as OrcidResponse,
    );

    for (const item of data['expanded-result'] ?? []) {
      const id = item['orcid-id'];
      if (!id) continue;

      const displayName =
        item['credit-name']?.trim() ||
        [item['given-names'], item['family-names']].filter(Boolean).join(' ').trim();
      if (!displayName || nameMatchScore(displayName, names) < 0.75) continue;

      const institutions = (item['institution-name'] ?? []).filter(Boolean);
      const url = `https://orcid.org/${id}`;
      const snippet = institutions.join('; ');

      const { confidence, signals } = scoreHit(
        { url, title: displayName, snippet, sourcePrior: 0.7 },
        target,
        names,
      );
      if (confidence === 0) continue;

      const ev = [evidence(ID, url, startedAt, displayName, snippet)];

      result.profiles.push({
        platform: 'orcid',
        url,
        handle: id,
        displayName,
        title: displayName,
        snippet,
        confidence: clamp(confidence),
        signals,
        evidence: ev,
      });

      result.facts.push({
        kind: 'identifier',
        value: `ORCID: ${id}`,
        confidence: clamp(confidence),
        signals,
        evidence: ev,
      });

      for (const institution of [...new Set(institutions)].slice(0, 5)) {
        result.facts.push({
          kind: 'employer',
          value: institution,
          confidence: clamp(confidence),
          signals: [...signals, 'место работы указано самим исследователем'],
          evidence: ev,
        });
      }
    }

    return result;
  },
};

/** Экранирует спецсимволы Solr-запроса, на котором работает поиск ORCID. */
function quote(value: string): string {
  return `"${value.replace(/["\\]/g, '')}"`;
}
