import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canonicalUrl } from '../src/core/html.ts';
import { buildNameVariants } from '../src/core/text.ts';
import { seedProfilesSource } from '../src/sources/seeds.ts';
import type { Target } from '../src/types.ts';
import { fakeHttp, silentLogger, type Route } from './helpers.ts';

const AT = '2026-01-01T00:00:00.000Z';

function context(target: Target, routes: Route[] = []) {
  return {
    target,
    names: buildNameVariants(target.fullName),
    http: fakeHttp(routes),
    log: silentLogger,
    maxResults: 10,
    startedAt: AT,
  };
}

describe('canonicalUrl: параметры шаринга', () => {
  it('снимает igsh у ссылок Instagram', () => {
    assert.equal(
      canonicalUrl('https://www.instagram.com/some_user?igsh=a2JyYXVsdndoeGlt'),
      'https://instagram.com/some_user',
    );
  });
});

describe('seedProfilesSource', () => {
  const base: Target = { fullName: 'Иван Петров', city: 'Москва', keywords: [] };

  it('без заданных профилей ничего не делает и в сеть не ходит', async () => {
    const ctx = context(base);
    const result = await seedProfilesSource.run(ctx);

    assert.deepEqual(result.profiles, []);
    assert.equal((ctx.http as { calls: string[] }).calls.length, 0);
  });

  it('превращает переданный адрес в находку и чистит его от мусора', async () => {
    const target = {
      ...base,
      knownProfiles: ['https://www.instagram.com/ivan_petrov?igsh=a2JyYXVsdndoeGlt'],
    };
    const result = await seedProfilesSource.run(context(target, [{ match: 'duckduckgo', body: '' }]));

    const seed = result.profiles.find((p) => p.platform === 'instagram');
    assert.ok(seed, 'профиль из переданного адреса должен появиться');
    assert.equal(seed.url, 'https://instagram.com/ivan_petrov');
    assert.equal(seed.handle, 'ivan_petrov');
  });

  it('честно помечает, что адрес не проверялся', async () => {
    const target = { ...base, knownProfiles: ['https://vk.com/ivan_petrov'] };
    const result = await seedProfilesSource.run(context(target, [{ match: 'duckduckgo', body: '' }]));

    const seed = result.profiles[0]!;
    assert.ok(seed.confidence < 1, 'утверждение пользователя не даёт полной уверенности');
    assert.ok(seed.signals.some((s) => s.includes('не проверялся')));
  });

  it('пропускает адрес, который не является профилем', async () => {
    const target = { ...base, knownProfiles: ['https://example.com/about', 'https://vk.com/feed'] };
    const result = await seedProfilesSource.run(context(target));

    assert.deepEqual(result.profiles, []);
  });

  it('ищет тот же ник на других площадках', async () => {
    const found = `<html><body>
      <div class="result">
        <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fgithub.com%2Fivan_petrov">ivan_petrov</a></h2>
        <a class="result__snippet">Разработчик</a>
      </div>
      <div class="result">
        <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fblog">Блог</a></h2>
        <a class="result__snippet">Не профиль</a>
      </div>
    </body></html>`;

    const target = { ...base, knownProfiles: ['https://instagram.com/ivan_petrov'] };
    const result = await seedProfilesSource.run(context(target, [{ match: 'duckduckgo', body: found }]));

    const github = result.profiles.find((p) => p.platform === 'github');
    assert.ok(github, 'совпадение ника на другой площадке должно найтись');
    assert.ok(github.signals.some((s) => s.includes('тот же ник')));
    // Совпадение ника — зацепка, а не доказательство.
    assert.ok(github.confidence < 0.75, `ожидалось ниже 0.75, получено ${github.confidence}`);

    assert.ok(!result.profiles.some((p) => p.url.includes('example.com')), 'не-профиль не должен попасть');
  });

  it('короткий ник по вебу не ищется', async () => {
    const ctx = context(
      { ...base, knownProfiles: ['https://vk.com/abc'] },
      [{ match: 'duckduckgo', body: '' }],
    );
    await seedProfilesSource.run(ctx);

    assert.equal((ctx.http as { calls: string[] }).calls.length, 0);
  });

  it('ник попадает в факты как известное написание имени', async () => {
    const target = { ...base, knownProfiles: ['https://vk.com/ivan_petrov'] };
    const result = await seedProfilesSource.run(context(target, [{ match: 'duckduckgo', body: '' }]));

    const alias = result.facts.find((f) => f.kind === 'alias');
    assert.ok(alias?.value.includes('ivan_petrov'));
  });
});
