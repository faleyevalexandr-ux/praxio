import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAllowed, parseRobots } from '../src/core/robots.ts';

describe('parseRobots / isAllowed', () => {
  it('применяет правила группы «*»', () => {
    const policy = parseRobots(
      `User-agent: *
Disallow: /private/
Allow: /private/public-page`,
      'person-osint/0.1.0',
    );

    assert.equal(isAllowed(policy, '/private/secret'), false);
    assert.equal(isAllowed(policy, '/private/public-page'), true);
    assert.equal(isAllowed(policy, '/anything-else'), true);
  });

  it('точное совпадение User-agent важнее «*»', () => {
    const policy = parseRobots(
      `User-agent: *
Disallow: /

User-agent: person-osint
Disallow: /admin/`,
      'person-osint/0.1.0',
    );

    assert.equal(isAllowed(policy, '/catalog'), true);
    assert.equal(isAllowed(policy, '/admin/panel'), false);
  });

  it('побеждает самое длинное правило', () => {
    const policy = parseRobots(
      `User-agent: *
Disallow: /a/
Allow: /a/b/
Disallow: /a/b/c/`,
      'bot',
    );

    assert.equal(isAllowed(policy, '/a/x'), false);
    assert.equal(isAllowed(policy, '/a/b/x'), true);
    assert.equal(isAllowed(policy, '/a/b/c/x'), false);
  });

  it('поддерживает подстановку * и якорь $', () => {
    const policy = parseRobots(
      `User-agent: *
Disallow: /*.pdf$
Disallow: /search?*`,
      'bot',
    );

    assert.equal(isAllowed(policy, '/docs/report.pdf'), false);
    assert.equal(isAllowed(policy, '/docs/report.pdf.html'), true);
    assert.equal(isAllowed(policy, '/search?q=test'), false);
  });

  it('пустой Disallow означает «разрешено всё»', () => {
    const policy = parseRobots('User-agent: *\nDisallow:', 'bot');
    assert.equal(isAllowed(policy, '/whatever'), true);
  });

  it('читает Crawl-delay', () => {
    const policy = parseRobots('User-agent: *\nCrawl-delay: 2.5\nDisallow: /x', 'bot');
    assert.equal(policy.crawlDelayMs, 2500);
  });

  it('игнорирует комментарии и мусорные строки', () => {
    const policy = parseRobots(
      `# комментарий
User-agent: *   # тоже комментарий
Disallow: /tmp/
случайная строка без двоеточия`,
      'bot',
    );
    assert.equal(isAllowed(policy, '/tmp/a'), false);
  });

  it('отсутствующий robots.txt не блокирует обход', () => {
    assert.equal(isAllowed({ rules: [], missing: true }, '/anything'), true);
  });
});
