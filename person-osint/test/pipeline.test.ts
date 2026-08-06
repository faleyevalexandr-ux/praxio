import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { investigate } from '../src/pipeline/run.ts';
import { renderMarkdown } from '../src/report/markdown.ts';
import { selectSources, unknownSourceIds } from '../src/sources/index.ts';
import type { Target } from '../src/types.ts';
import { fakeHttp, type Route } from './helpers.ts';

const target: Target = {
  fullName: 'Иван Петров',
  city: 'Москва',
  company: 'Яндекс',
  keywords: [],
  purpose: 'проверка контрагента',
};

const DDG_RESULTS = `
<html><body>
  <div class="result">
    <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fivan-petrov">Иван Петров — LinkedIn</a></h2>
    <a class="result__snippet">Ведущий разработчик, Яндекс, Москва</a>
  </div>
  <div class="result">
    <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fsport.example.com%2Fturnir">Иван Петров выиграл турнир</a></h2>
    <a class="result__snippet">Спортсмен из Перми, шахматы</a>
  </div>
  <div class="result">
    <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fteam">Команда компании</a></h2>
    <a class="result__snippet">Сергей Иванов и Ольга Смирнова</a>
  </div>
</body></html>`;

const LINKEDIN_PAGE = `<!doctype html><html><head>
  <title>Иван Петров | LinkedIn</title>
  <meta name="description" content="Ведущий разработчик в Яндекс, Москва">
  <script type="application/ld+json">
  { "@type": "Person", "name": "Иван Петров", "jobTitle": "Ведущий разработчик",
    "worksFor": { "@type": "Organization", "name": "Яндекс" },
    "address": { "addressLocality": "Москва" },
    "sameAs": ["https://github.com/ipetrov"] }
  </script>
</head><body>Профиль Иван Петров, Яндекс, Москва</body></html>`;

const GITHUB_PAGE = `<!doctype html><html><head><title>ipetrov (Иван Петров) · GitHub</title>
  <meta name="description" content="Иван Петров, Яндекс, Москва"></head><body>Иван Петров</body></html>`;

const ROUTES: Route[] = [
  { match: 'duckduckgo.com', body: DDG_RESULTS },
  { match: 'linkedin.com/in/ivan-petrov', body: LINKEDIN_PAGE },
  { match: 'api.github.com/search/users', body: JSON.stringify({ items: [{ login: 'ipetrov' }] }) },
  {
    match: 'api.github.com/users/ipetrov',
    body: JSON.stringify({
      login: 'ipetrov',
      name: 'Иван Петров',
      company: '@Яндекс',
      location: 'Москва, Россия',
      blog: 'https://ipetrov.dev',
      bio: 'Разработчик поиска',
      twitter_username: 'ipetrov',
      html_url: 'https://github.com/ipetrov',
      public_repos: 12,
      followers: 340,
    }),
  },
  { match: 'github.com/ipetrov', body: GITHUB_PAGE },
];

describe('investigate (сквозной прогон без сети)', () => {
  it('собирает профили, факты и документы из нескольких источников', async () => {
    const report = await investigate(target, {
      http: fakeHttp(ROUTES),
      only: ['websearch', 'github'],
      config: { logLevel: 'silent' },
    });

    assert.equal(report.stats.sourcesFailed, 0);
    assert.equal(report.sources.length, 2);

    const platforms = report.profiles.map((p) => p.platform);
    assert.ok(platforms.includes('linkedin'), `нет LinkedIn: ${platforms.join(', ')}`);
    assert.ok(platforms.includes('github'), `нет GitHub: ${platforms.join(', ')}`);

    const employers = report.facts.filter((f) => f.kind === 'employer').map((f) => f.value);
    assert.ok(employers.some((v) => v.includes('Яндекс')), `нет работодателя: ${employers.join(', ')}`);

    const locations = report.facts.filter((f) => f.kind === 'location').map((f) => f.value);
    assert.ok(locations.some((v) => v.includes('Москва')));
  });

  it('каждая находка несёт ссылку на первоисточник и дату', async () => {
    const report = await investigate(target, {
      http: fakeHttp(ROUTES),
      only: ['websearch', 'github'],
      config: { logLevel: 'silent' },
    });

    for (const item of [...report.profiles, ...report.documents, ...report.facts]) {
      assert.ok(item.evidence.length > 0, 'находка без доказательства');
      for (const ev of item.evidence) {
        assert.ok(ev.url.startsWith('http'), `плохой URL доказательства: ${ev.url}`);
        assert.ok(Number.isFinite(Date.parse(ev.retrievedAt)));
        assert.ok(ev.sourceId.length > 0);
      }
    }
  });

  it('однофамилец без совпадений по городу и компании остаётся низкоуверенным', async () => {
    const report = await investigate(target, {
      http: fakeHttp(ROUTES),
      only: ['websearch'],
      config: { logLevel: 'silent' },
    });

    const chess = report.documents.find((d) => d.url.includes('sport.example.com'));
    assert.ok(chess, 'находка про турнир должна попасть в отчёт');
    assert.ok(chess.confidence <= 0.62, `ожидалась низкая уверенность, получено ${chess.confidence}`);

    const linkedin = report.profiles.find((p) => p.platform === 'linkedin');
    assert.ok(linkedin && linkedin.confidence > chess.confidence);
  });

  it('страница без совпадения имени в отчёт не попадает', async () => {
    const report = await investigate(target, {
      http: fakeHttp(ROUTES),
      only: ['websearch'],
      config: { logLevel: 'silent' },
    });

    assert.ok(!report.documents.some((d) => d.url.includes('example.com/team')));
  });

  it('sameAs со страницы профиля превращается в связанный аккаунт', async () => {
    const report = await investigate(target, {
      http: fakeHttp(ROUTES),
      only: ['websearch'],
      config: { logLevel: 'silent' },
    });

    const github = report.profiles.find((p) => p.url.includes('github.com/ipetrov'));
    assert.ok(github, 'ссылка sameAs должна дать профиль GitHub');
    assert.ok(github.signals.some((s) => s.includes('заявлен как свой')));
  });

  it('площадка профиля берётся из ссылки, а не из site:-запроса', async () => {
    // Выдача по site: приносит ссылку с соседнего домена — она не должна
    // получить ярлык той площадки, по которой шёл запрос.
    const vkTarget = { fullName: 'Алексей Маникин', city: 'Санкт-Петербург', keywords: [] };
    const vkResults = `<html><body><div class="result">
      <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fvk.ru%2Falexei_manikin%3Ffrom%3Dsearch">Алексей Маникин | ВКонтакте</a></h2>
      <a class="result__snippet">Санкт-Петербург</a>
    </div></body></html>`;

    const report = await investigate(vkTarget, {
      http: fakeHttp([{ match: 'duckduckgo.com', body: vkResults }]),
      only: ['social'],
      config: { logLevel: 'silent', enrichLimit: 0 },
    });

    assert.ok(report.profiles.length > 0);
    for (const profile of report.profiles) {
      assert.equal(profile.platform, 'vk', `неверная площадка для ${profile.url}`);
    }
    // Один и тот же профиль не должен продублироваться на каждый site:-запрос.
    assert.equal(report.profiles.length, 1);
    assert.equal(report.profiles[0]!.url, 'https://vk.ru/alexei_manikin');
  });

  it('недоступный источник не роняет прогон', async () => {
    const report = await investigate(target, {
      http: fakeHttp([{ match: 'duckduckgo.com', body: '', status: 503 }]),
      only: ['websearch', 'github'],
      config: { logLevel: 'silent' },
    });

    assert.equal(report.stats.sourcesFailed, 0);
    assert.equal(report.stats.totalProfiles, 0);
  });

  it('без города и компании выдаёт предупреждение об однофамильцах', async () => {
    const report = await investigate(
      { fullName: 'Иван Петров', keywords: [] },
      { http: fakeHttp(ROUTES), only: ['websearch'], config: { logLevel: 'silent' } },
    );

    assert.ok(report.ambiguity.commonNameWarning);
    assert.ok(report.ambiguity.notes.some((n) => n.includes('--city')));
  });

  it('пустой выбор источников — явная ошибка', async () => {
    await assert.rejects(
      () => investigate(target, { only: ['websearch'], skip: ['websearch'], config: { logLevel: 'silent' } }),
      /Не выбрано ни одного источника/,
    );
  });
});

describe('selectSources', () => {
  it('--only оставляет только указанные', () => {
    assert.deepEqual(selectSources({ only: ['github'] }).map((s) => s.id), ['github']);
  });

  it('--skip убирает указанные', () => {
    assert.ok(!selectSources({ skip: ['github'] }).some((s) => s.id === 'github'));
  });

  it('опечатки в идентификаторах ловятся заранее', () => {
    assert.deepEqual(unknownSourceIds(['github', 'githab']), ['githab']);
  });
});

describe('renderMarkdown', () => {
  it('строит отчёт с разделами, ссылками и правовой оговоркой', async () => {
    const report = await investigate(target, {
      http: fakeHttp(ROUTES),
      only: ['websearch', 'github'],
      config: { logLevel: 'silent' },
    });
    const markdown = renderMarkdown(report, 0.45);

    assert.match(markdown, /^# Отчёт по открытым источникам: Иван Петров/m);
    assert.match(markdown, /\*\*Цель сбора:\*\* проверка контрагента/);
    assert.match(markdown, /## Профили и аккаунты/);
    assert.match(markdown, /## Источники/);
    assert.match(markdown, /персональные данные/);
    assert.match(markdown, /https:\/\/github\.com\/ipetrov/);
  });

  it('находки ниже порога уходят в отдельный раздел, а не в основной', async () => {
    const report = await investigate(target, {
      http: fakeHttp(ROUTES),
      only: ['websearch'],
      config: { logLevel: 'silent' },
    });
    const strict = renderMarkdown(report, 0.7);

    assert.match(strict, /## Требует проверки/);
    const [main, unverified] = strict.split('## Требует проверки');
    assert.ok(!main!.includes('sport.example.com'), 'слабая находка не должна быть в основном разделе');
    assert.match(unverified!, /sport\.example\.com/);
  });

  it('экранирует вертикальную черту, чтобы не ломать таблицу', async () => {
    const report = await investigate(target, {
      http: fakeHttp(ROUTES),
      only: ['github'],
      config: { logLevel: 'silent' },
    });
    report.profiles[0]!.displayName = 'Иван | Петров';
    const markdown = renderMarkdown(report, 0.45);
    assert.match(markdown, /Иван \\\| Петров/);
  });
});
