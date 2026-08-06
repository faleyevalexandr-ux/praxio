import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detectPlatform,
  estimateDistinctPeople,
  extractHandle,
  looksLikeProfileUrl,
  scoreHit,
} from '../src/core/score.ts';
import { buildNameVariants } from '../src/core/text.ts';
import type { Target } from '../src/types.ts';

const names = buildNameVariants('Иван Петров');
const target: Target = { fullName: 'Иван Петров', city: 'Москва', company: 'Яндекс', keywords: [] };

describe('scoreHit', () => {
  it('без совпадения имени находка отбрасывается', () => {
    const result = scoreHit(
      { url: 'https://example.com/a', title: 'Сергей Иванов', snippet: 'Москва, Яндекс' },
      target,
      names,
    );
    assert.equal(result.confidence, 0);
  });

  it('имя плюс город и компания дают высокую уверенность', () => {
    const result = scoreHit(
      {
        url: 'https://linkedin.com/in/ivan-petrov',
        title: 'Иван Петров',
        snippet: 'Ведущий разработчик, Яндекс, Москва',
      },
      target,
      names,
    );
    assert.ok(result.confidence >= 0.75, `ожидалось ≥0.75, получено ${result.confidence}`);
  });

  it('одно лишь имя не проходит выше потолка для однофамильцев', () => {
    const result = scoreHit(
      { url: 'https://example.com/news', title: 'Иван Петров выиграл турнир', snippet: 'Пермь' },
      target,
      names,
    );
    assert.ok(result.confidence > 0);
    assert.ok(result.confidence <= 0.62, `ожидалось ≤0.62, получено ${result.confidence}`);
    assert.ok(result.signals.some((s) => s.includes('нет подтверждения')));
  });

  it('имя, зашитое в URL, тоже засчитывается', () => {
    const result = scoreHit(
      { url: 'https://linkedin.com/in/ivan-petrov-8a41b2', title: 'LinkedIn', snippet: 'Яндекс' },
      target,
      names,
    );
    assert.ok(result.confidence > 0.5);
  });

  it('оценка не выходит за границы 0..1', () => {
    const result = scoreHit(
      {
        url: 'https://linkedin.com/in/ivan-petrov',
        title: 'Иван Петров',
        snippet: 'Яндекс Москва Яндекс Москва',
        body: 'Иван Петров, Яндекс, Москва',
        sourcePrior: 1,
      },
      { ...target, keywords: ['разработчик'] },
      names,
    );
    assert.ok(result.confidence <= 1);
  });
});

describe('looksLikeProfileUrl', () => {
  it('распознаёт профили', () => {
    assert.ok(looksLikeProfileUrl('https://www.linkedin.com/in/ivan-petrov'));
    assert.ok(looksLikeProfileUrl('https://github.com/ivanpetrov'));
    assert.ok(looksLikeProfileUrl('https://vk.com/ivan_petrov'));
    assert.ok(looksLikeProfileUrl('https://habr.com/ru/users/ipetrov/'));
  });

  it('отсеивает служебные разделы', () => {
    assert.ok(!looksLikeProfileUrl('https://github.com/features'));
    assert.ok(!looksLikeProfileUrl('https://linkedin.com/jobs'));
    assert.ok(!looksLikeProfileUrl('https://vk.com/feed'));
  });

  it('отсеивает вложенные страницы вместо профиля', () => {
    assert.ok(!looksLikeProfileUrl('https://github.com/ivanpetrov/some-repo'));
  });

  it('чужие домены профилями не считаются', () => {
    assert.ok(!looksLikeProfileUrl('https://example.com/ivan'));
  });
});

describe('detectPlatform / extractHandle', () => {
  it('определяет площадку по домену', () => {
    assert.equal(detectPlatform('https://www.github.com/x')?.platform, 'github');
    assert.equal(detectPlatform('https://t.me/durov')?.platform, 'telegram');
    assert.equal(detectPlatform('not a url'), undefined);
  });

  it('достаёт ник из URL', () => {
    assert.equal(extractHandle('https://github.com/ivanpetrov'), 'ivanpetrov');
    assert.equal(extractHandle('https://www.linkedin.com/in/ivan-petrov/'), 'ivan-petrov');
  });
});

describe('estimateDistinctPeople', () => {
  it('одинаковый контекст считает одним человеком', () => {
    const texts = [
      'Иван Петров разработчик компании Яндекс Москва',
      'Иван Петров разработчик компании Яндекс Москва',
    ];
    assert.equal(estimateDistinctPeople(texts, names), 1);
  });

  it('разные контексты дают больше кандидатов', () => {
    const texts = [
      'Иван Петров хоккеист сборной Челябинска чемпионат',
      'Иван Петров профессор биологии Новосибирского института',
      'Иван Петров разработчик компании Яндекс Москва',
    ];
    assert.ok(estimateDistinctPeople(texts, names) >= 2);
  });
});
