/** Ограничитель одновременно выполняющихся задач. */
export function createConcurrencyLimiter(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const release = () => {
    active--;
    const next = queue.shift();
    if (next) next();
  };

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

/**
 * Выдерживает минимальную паузу между обращениями к одному хосту.
 * Сериализует запросы к хосту в цепочку промисов, поэтому параллельные вызовы
 * не могут «проскочить» мимо задержки.
 */
export class HostPacer {
  private chains = new Map<string, Promise<void>>();
  private delays = new Map<string, number>();
  private readonly defaultDelayMs: number;

  constructor(defaultDelayMs: number) {
    this.defaultDelayMs = defaultDelayMs;
  }

  /** Crawl-delay из robots.txt переопределяет дефолт, но только в большую сторону. */
  setDelay(host: string, delayMs: number): void {
    const current = this.delays.get(host) ?? this.defaultDelayMs;
    if (delayMs > current) this.delays.set(host, delayMs);
  }

  getDelay(host: string): number {
    return this.delays.get(host) ?? this.defaultDelayMs;
  }

  async acquire(host: string): Promise<void> {
    const delay = this.getDelay(host);
    const previous = this.chains.get(host) ?? Promise.resolve();
    let unlock!: () => void;
    const slot = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    this.chains.set(host, previous.then(() => slot));
    await previous;
    setTimeout(unlock, delay);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
