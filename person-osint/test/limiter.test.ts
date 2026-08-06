import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createConcurrencyLimiter, HostPacer } from '../src/core/limiter.ts';

describe('createConcurrencyLimiter', () => {
  it('не пускает больше задач, чем разрешено', async () => {
    const limit = createConcurrencyLimiter(2);
    let active = 0;
    let peak = 0;

    await Promise.all(
      Array.from({ length: 8 }, () =>
        limit(async () => {
          active++;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active--;
        }),
      ),
    );

    assert.equal(peak, 2);
    assert.equal(active, 0);
  });

  it('освобождает слот после исключения', async () => {
    const limit = createConcurrencyLimiter(1);
    await assert.rejects(() => limit(async () => { throw new Error('упало'); }), /упало/);
    assert.equal(await limit(async () => 'работает'), 'работает');
  });
});

describe('HostPacer', () => {
  it('разносит обращения к одному хосту по времени', async () => {
    const pacer = new HostPacer(30);
    const stamps: number[] = [];

    await Promise.all(
      Array.from({ length: 3 }, async () => {
        await pacer.acquire('example.com');
        stamps.push(Date.now());
      }),
    );

    stamps.sort((a, b) => a - b);
    // Первый запрос уходит сразу, каждый следующий — не раньше чем через паузу.
    assert.ok(stamps[1]! - stamps[0]! >= 25, `интервал 1: ${stamps[1]! - stamps[0]!}`);
    assert.ok(stamps[2]! - stamps[1]! >= 25, `интервал 2: ${stamps[2]! - stamps[1]!}`);
  });

  it('разные хосты не ждут друг друга', async () => {
    const pacer = new HostPacer(200);
    const began = Date.now();
    await Promise.all([pacer.acquire('a.example'), pacer.acquire('b.example')]);
    assert.ok(Date.now() - began < 150);
  });

  it('Crawl-delay поднимает паузу, но не опускает её', () => {
    const pacer = new HostPacer(1000);
    pacer.setDelay('slow.example', 5000);
    assert.equal(pacer.getDelay('slow.example'), 5000);
    pacer.setDelay('slow.example', 100);
    assert.equal(pacer.getDelay('slow.example'), 5000);
  });
});
