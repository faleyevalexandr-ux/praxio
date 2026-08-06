import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildQuery, searchDuckDuckGo, unwrapRedirect } from '../src/core/ddg.ts';
import { canonicalUrl, extractPageMeta } from '../src/core/html.ts';
import { parseRss } from '../src/sources/news.ts';
import { fakeHttp, silentLogger } from './helpers.ts';

describe('canonicalUrl', () => {
  it('снимает utm-метки, якорь, www и хвостовой слэш', () => {
    assert.equal(
      canonicalUrl('https://WWW.Example.com/profile/?utm_source=ddg&id=7#bio'),
      'https://example.com/profile?id=7',
    );
  });

  it('не трогает корневой слэш', () => {
    assert.equal(canonicalUrl('https://example.com/'), 'https://example.com/');
  });

  it('возвращает вход, если это не URL', () => {
    assert.equal(canonicalUrl('ерунда'), 'ерунда');
  });
});

describe('unwrapRedirect', () => {
  it('разворачивает редирект DuckDuckGo', () => {
    const href = '//duckduckgo.com/l/?uddg=https%3A%2F%2Fgithub.com%2Fipetrov&rut=abc';
    assert.equal(unwrapRedirect(href), 'https://github.com/ipetrov');
  });

  it('пропускает прямые ссылки', () => {
    assert.equal(unwrapRedirect('https://habr.com/ru/users/x/'), 'https://habr.com/ru/users/x/');
  });

  it('отбрасывает внутренние ссылки поисковика', () => {
    assert.equal(unwrapRedirect('https://duckduckgo.com/settings'), undefined);
  });

  it('отбрасывает не-http схемы', () => {
    assert.equal(unwrapRedirect('javascript:alert(1)'), undefined);
  });
});

describe('buildQuery', () => {
  it('берёт имя в кавычки, многословный уточнитель тоже', () => {
    assert.equal(
      buildQuery('Иван Петров', 'Яндекс Такси', 'Москва'),
      '"Иван Петров" "Яндекс Такси" Москва',
    );
  });

  it('пропускает пустые уточнители', () => {
    assert.equal(buildQuery('Ada Lovelace', undefined, ''), '"Ada Lovelace"');
  });
});

const DDG_HTML = `
<html><body>
  <div class="result results_links">
    <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fgithub.com%2Fipetrov">Ivan Petrov (ipetrov)</a></h2>
    <a class="result__snippet">Разработчик в Яндексе, Москва</a>
  </div>
  <div class="result results_links">
    <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fnews">Новость</a></h2>
    <a class="result__snippet">Текст новости</a>
  </div>
</body></html>`;

const DDG_LITE = `
<html><body><table>
  <tr><td><a class="result-link" href="https://habr.com/ru/users/ipetrov/">Профиль на Хабре</a></td></tr>
  <tr><td class="result-snippet">Публикации автора</td></tr>
</table></body></html>`;

describe('searchDuckDuckGo', () => {
  it('разбирает основную вёрстку и разворачивает редиректы', async () => {
    const http = fakeHttp([{ match: 'html.duckduckgo.com', body: DDG_HTML }]);
    const results = await searchDuckDuckGo(http, 'Иван Петров', 10, silentLogger);

    assert.equal(results.length, 2);
    assert.equal(results[0]?.url, 'https://github.com/ipetrov');
    assert.equal(results[0]?.title, 'Ivan Petrov (ipetrov)');
    assert.match(results[0]?.snippet ?? '', /Яндекс/);
  });

  it('соблюдает предел числа результатов', async () => {
    const http = fakeHttp([{ match: 'html.duckduckgo.com', body: DDG_HTML }]);
    assert.equal((await searchDuckDuckGo(http, 'q', 1, silentLogger)).length, 1);
  });

  it('переходит на lite-эндпоинт, когда основной вернул пусто', async () => {
    const http = fakeHttp([
      { match: 'html.duckduckgo.com', body: '<html><body>ничего</body></html>' },
      { match: 'lite.duckduckgo.com', body: DDG_LITE },
    ]);
    const results = await searchDuckDuckGo(http, 'Иван Петров', 10, silentLogger);

    assert.equal(results.length, 1);
    assert.equal(results[0]?.url, 'https://habr.com/ru/users/ipetrov/');
  });

  it('честно пустая выдача не порождает второй запрос', async () => {
    // Для узких site:-дорков пустой результат — норма. Дублировать такой запрос
    // на lite значит удвоить трафик и упереться в ограничение частоты.
    const http = fakeHttp([
      { match: 'html.duckduckgo.com', body: '<html><body><div id="links" class="results"></div></body></html>' },
      { match: 'lite.duckduckgo.com', body: DDG_LITE },
    ]);
    const results = await searchDuckDuckGo(http, 'q', 10, silentLogger);

    assert.deepEqual(results, []);
    assert.equal(http.calls.length, 1, `ожидался один запрос, было: ${http.calls.join(', ')}`);
  });

  it('нераспознанная вёрстка всё же уводит на lite', async () => {
    const http = fakeHttp([
      { match: 'html.duckduckgo.com', body: '<html><body>капча</body></html>' },
      { match: 'lite.duckduckgo.com', body: DDG_LITE },
    ]);
    await searchDuckDuckGo(http, 'q', 10, silentLogger);
    assert.equal(http.calls.length, 2);
  });

  it('возвращает пусто, если оба эндпоинта недоступны', async () => {
    const http = fakeHttp([{ match: 'duckduckgo.com', body: '', status: 503 }]);
    assert.deepEqual(await searchDuckDuckGo(http, 'q', 10, silentLogger), []);
  });
});

const PAGE = `<!doctype html>
<html><head>
  <title>Иван Петров — личная страница</title>
  <meta name="description" content="Инженер, Москва">
  <meta property="og:image" content="https://example.com/photo.jpg">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "name": "Сайт" },
      {
        "@type": "Person",
        "name": "Иван Петров",
        "jobTitle": "Ведущий инженер",
        "worksFor": { "@type": "Organization", "name": "Яндекс" },
        "address": { "@type": "PostalAddress", "addressLocality": "Москва" },
        "alumniOf": [{ "@type": "CollegeOrUniversity", "name": "МГУ" }],
        "sameAs": ["https://github.com/ipetrov", "https://t.me/ipetrov"]
      }
    ]
  }
  </script>
</head><body>
  <a rel="me" href="/blog">Блог</a>
  <p>Работаю над поиском.</p>
  <script>console.log('не должен попасть в текст')</script>
</body></html>`;

describe('extractPageMeta', () => {
  const meta = extractPageMeta(PAGE, 'https://example.com/about');

  it('читает заголовок и описание', () => {
    assert.equal(meta.title, 'Иван Петров — личная страница');
    assert.equal(meta.description, 'Инженер, Москва');
  });

  it('находит Person внутри @graph', () => {
    assert.equal(meta.person?.name, 'Иван Петров');
    assert.equal(meta.person?.jobTitle, 'Ведущий инженер');
  });

  it('разворачивает вложенные объекты schema.org в строки', () => {
    assert.equal(meta.person?.worksFor, 'Яндекс');
    assert.equal(meta.person?.address, 'Москва');
    assert.equal(meta.person?.alumniOf, 'МГУ');
  });

  it('собирает sameAs и rel=me, приводя ссылки к абсолютным', () => {
    assert.ok(meta.sameAs.includes('https://github.com/ipetrov'));
    assert.ok(meta.sameAs.includes('https://t.me/ipetrov'));
    assert.ok(meta.sameAs.includes('https://example.com/blog'));
  });

  it('в текст страницы не попадают скрипты', () => {
    assert.match(meta.text, /Работаю над поиском/);
    assert.doesNotMatch(meta.text, /не должен попасть/);
  });

  it('переживает битый JSON-LD', () => {
    const broken = extractPageMeta(
      '<html><head><script type="application/ld+json">{ сломано }</script></head><body>x</body></html>',
      'https://example.com',
    );
    assert.equal(broken.person, undefined);
  });
});

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>Иван Петров возглавил отдел</title>
    <link>https://news.example.com/1</link>
    <pubDate>Mon, 03 Feb 2025 10:00:00 GMT</pubDate>
    <description>&lt;a href="x"&gt;Подробности назначения&lt;/a&gt;</description>
    <source url="https://news.example.com">Пример</source>
  </item>
  <item>
    <title>Без ссылки</title>
    <link></link>
  </item>
</channel></rss>`;

describe('parseRss', () => {
  const items = parseRss(RSS);

  it('пропускает элементы без ссылки', () => {
    assert.equal(items.length, 1);
  });

  it('вытаскивает текст из HTML внутри description', () => {
    assert.equal(items[0]?.description, 'Подробности назначения');
  });

  it('нормализует дату в ISO', () => {
    assert.equal(items[0]?.pubDate, '2025-02-03T10:00:00.000Z');
  });

  it('сохраняет издание', () => {
    assert.equal(items[0]?.source, 'Пример');
  });
});
