import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeDocuments, mergeFacts, mergeProfiles } from '../src/core/merge.ts';
import type { DocumentHit, Fact, ProfileHit } from '../src/types.ts';

const AT = '2026-01-01T00:00:00.000Z';

function profile(overrides: Partial<ProfileHit> & { url: string; sourceId: string }): ProfileHit {
  const { sourceId, ...rest } = overrides;
  return {
    platform: 'github',
    confidence: 0.6,
    signals: [],
    evidence: [{ sourceId, url: overrides.url, retrievedAt: AT }],
    ...rest,
  };
}

describe('mergeProfiles', () => {
  it('схлопывает один профиль, пришедший разными URL', () => {
    const merged = mergeProfiles([
      profile({ url: 'https://github.com/ipetrov', sourceId: 'websearch' }),
      profile({ url: 'https://www.github.com/ipetrov/?utm_source=x', sourceId: 'websearch' }),
    ]);
    assert.equal(merged.length, 1);
  });

  it('подтверждение вторым источником повышает уверенность', () => {
    const merged = mergeProfiles([
      profile({ url: 'https://github.com/ipetrov', sourceId: 'websearch', confidence: 0.6 }),
      profile({ url: 'https://github.com/ipetrov', sourceId: 'social', confidence: 0.6 }),
    ]);
    assert.equal(merged.length, 1);
    assert.ok(merged[0]!.confidence > 0.6);
    assert.equal(merged[0]!.evidence.length, 2);
  });

  it('повтор из того же источника уверенность не поднимает', () => {
    const merged = mergeProfiles([
      profile({ url: 'https://github.com/ipetrov', sourceId: 'websearch', confidence: 0.6 }),
      profile({ url: 'https://github.com/ipetrov', sourceId: 'websearch', confidence: 0.5 }),
    ]);
    assert.equal(merged[0]!.confidence, 0.6);
  });

  it('один профиль с параметрами поиска и без них считается одним', () => {
    // Поисковик отдаёт одну и ту же страницу с ?from=search и без него.
    const merged = mergeProfiles([
      profile({ url: 'https://vk.ru/alexei_manikin?from=search', platform: 'vk', sourceId: 'social' }),
      profile({ url: 'https://vk.ru/alexei_manikin', platform: 'vk', sourceId: 'websearch' }),
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.url, 'https://vk.ru/alexei_manikin');
    assert.equal(merged[0]!.evidence.length, 2);
  });

  it('разные площадки не сливаются', () => {
    const merged = mergeProfiles([
      profile({ url: 'https://github.com/ipetrov', sourceId: 'a' }),
      profile({ url: 'https://vk.com/ipetrov', platform: 'vk', sourceId: 'b' }),
    ]);
    assert.equal(merged.length, 2);
  });

  it('сортирует по убыванию уверенности', () => {
    const merged = mergeProfiles([
      profile({ url: 'https://github.com/a', sourceId: 'a', confidence: 0.3 }),
      profile({ url: 'https://github.com/b', sourceId: 'a', confidence: 0.9 }),
    ]);
    assert.equal(merged[0]!.confidence, 0.9);
  });
});

describe('mergeDocuments', () => {
  const base: Omit<DocumentHit, 'url' | 'evidence'> = {
    kind: 'paper',
    title: 'Обучение с подкреплением в проде',
    confidence: 0.7,
    signals: [],
  };

  it('одну публикацию по разным ссылкам считает одной', () => {
    const merged = mergeDocuments([
      { ...base, url: 'https://doi.org/10.1/abc', evidence: [{ sourceId: 'crossref', url: 'https://doi.org/10.1/abc', retrievedAt: AT }] },
      { ...base, url: 'https://arxiv.org/abs/1', confidence: 0.6, evidence: [{ sourceId: 'openalex', url: 'https://arxiv.org/abs/1', retrievedAt: AT }] },
    ]);
    assert.equal(merged.length, 1, 'совпадение по заголовку должно схлопнуть дубль');
    assert.equal(merged[0]!.confidence, 0.7);
  });

  it('разные работы сохраняются', () => {
    const merged = mergeDocuments([
      { ...base, url: 'https://a.example/1', evidence: [{ sourceId: 'x', url: 'https://a.example/1', retrievedAt: AT }] },
      { ...base, title: 'Совсем другая работа', url: 'https://a.example/2', evidence: [{ sourceId: 'x', url: 'https://a.example/2', retrievedAt: AT }] },
    ]);
    assert.equal(merged.length, 2);
  });
});

describe('mergeFacts', () => {
  const fact = (value: string, sourceId: string, confidence = 0.6): Fact => ({
    kind: 'employer',
    value,
    confidence,
    signals: [],
    evidence: [{ sourceId, url: `https://${sourceId}.example`, retrievedAt: AT }],
  });

  it('одинаковые факты объединяются с ростом уверенности', () => {
    const merged = mergeFacts([fact('Яндекс', 'github'), fact('яндекс', 'orcid')]);
    assert.equal(merged.length, 1);
    assert.ok(merged[0]!.confidence > 0.6);
  });

  it('факты разного вида не смешиваются', () => {
    const merged = mergeFacts([fact('Москва', 'a'), { ...fact('Москва', 'b'), kind: 'location' }]);
    assert.equal(merged.length, 2);
  });
});
