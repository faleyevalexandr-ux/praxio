import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DryRunHttpClient, describeQuery, groupByHost } from '../src/core/dry-run.ts';
import { investigate } from '../src/pipeline/run.ts';
import type { Target } from '../src/types.ts';

describe('describeQuery', () => {
  it('достаёт фразу из разных имён параметров', () => {
    assert.equal(describeQuery('https://html.duckduckgo.com/html/?q=%22Иван%20Петров%22'), '"Иван Петров"');
    assert.equal(describeQuery('https://api.crossref.org/works?query.author=Иван+Петров&rows=15'), 'Иван Петров');
    assert.equal(describeQuery('https://api.stackexchange.com/2.3/users?inname=Иван+Петров&site=stackoverflow'), 'Иван Петров');
    assert.equal(describeQuery('https://api.openalex.org/authors?search=Иван+Петров'), 'Иван Петров');
  });

  it('возвращает undefined, если фразы в адресе нет', () => {
    assert.equal(describeQuery('https://api.github.com/users/ipetrov'), undefined);
    assert.equal(describeQuery('не адрес'), undefined);
  });
});

describe('groupByHost', () => {
  it('сворачивает одинаковые подписи и считает их', () => {
    // Один и тот же запрос уходит на двух языках — это разные запросы,
    // но подпись у них общая, и в выводе они не должны выглядеть дублями.
    const groups = groupByHost([
      'https://www.wikidata.org/w/api.php?search=Иван+Петров&language=ru',
      'https://www.wikidata.org/w/api.php?search=Иван+Петров&language=en',
      'https://www.wikidata.org/w/api.php?search=Петров+Иван&language=ru',
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.total, 3);

    const collapsed = groups[0]!.entries.find((e) => e.label === 'Иван Петров');
    assert.equal(collapsed?.count, 2);
    assert.equal(groups[0]!.entries.find((e) => e.label === 'Петров Иван')?.count, 1);
  });

  it('одинаковые адреса не считаются дважды', () => {
    const groups = groupByHost(['https://example.com/a?q=x', 'https://example.com/a?q=x']);
    assert.equal(groups[0]!.total, 1);
  });

  it('сортирует хосты по числу запросов', () => {
    const groups = groupByHost([
      'https://few.example/?q=1',
      'https://many.example/?q=1',
      'https://many.example/?q=2',
    ]);
    assert.equal(groups[0]!.host, 'many.example');
  });

  it('переживает некорректный адрес', () => {
    const groups = groupByHost(['ерунда']);
    assert.equal(groups[0]!.host, '(некорректный URL)');
  });
});

describe('сухой прогон целиком', () => {
  const target: Target = { fullName: 'Иван Петров', city: 'Москва', keywords: [] };

  it('не отправляет запросов и не находит находок', async () => {
    const report = await investigate(target, {
      only: ['websearch'],
      config: { logLevel: 'silent', dryRun: true },
    });

    assert.ok(report.plannedRequests && report.plannedRequests.length > 0, 'план должен быть непустым');
    assert.equal(report.stats.totalProfiles, 0);
    assert.equal(report.stats.totalDocuments, 0);
    assert.ok(report.plannedRequests.every((url) => url.includes('duckduckgo.com')));
  });

  it('обычный прогон план не заполняет', async () => {
    const report = await investigate(target, {
      only: ['websearch'],
      config: { logLevel: 'silent' },
      http: new DryRunHttpClient(),
    });

    assert.equal(report.plannedRequests, undefined);
  });
});
