import { USER_AGENT, type RuntimeConfig } from '../config.ts';
import type { HttpLike, HttpRequestOptions, HttpResponse, LoggerLike } from '../types.ts';
import { ResponseCache } from './cache.ts';
import { HostPacer, sleep } from './limiter.ts';
import { ALLOW_ALL, isAllowed, parseRobots, type RobotsPolicy } from './robots.ts';

export class RobotsDeniedError extends Error {
  constructor(url: string) {
    super(`robots.txt запрещает обход: ${url}`);
    this.name = 'RobotsDeniedError';
  }
}

export class HttpError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

/**
 * HTTP-клиент с тремя обязательными для краулера свойствами: соблюдение
 * robots.txt, пауза между запросами к одному хосту и ретраи с экспоненциальной
 * задержкой (с уважением к заголовку Retry-After).
 */
export class HttpClient implements HttpLike {
  private readonly pacer: HostPacer;
  private readonly cache: ResponseCache;
  private readonly robots = new Map<string, Promise<RobotsPolicy>>();
  private readonly config: RuntimeConfig;
  private readonly log: LoggerLike;

  constructor(config: RuntimeConfig, log: LoggerLike) {
    this.config = config;
    this.log = log;
    this.pacer = new HostPacer(config.perHostDelayMs);
    this.cache = new ResponseCache(config.cacheDir, config.cacheTtlMs, config.cache);
  }

  async get(url: string, options: HttpRequestOptions = {}): Promise<HttpResponse> {
    const parsed = new URL(url);

    const cached = await this.cache.get(url);
    if (cached) {
      this.log.debug(`cache hit ${url}`);
      return { url, status: cached.status, ok: cached.status < 400, body: cached.body, headers: cached.headers, fromCache: true };
    }

    if (this.config.respectRobots && !options.ignoreRobots) {
      const policy = await this.robotsFor(parsed);
      if (policy.crawlDelayMs) this.pacer.setDelay(parsed.host, policy.crawlDelayMs);
      if (!isAllowed(policy, parsed.pathname + parsed.search)) {
        throw new RobotsDeniedError(url);
      }
    }

    const retries = options.retries ?? this.config.retries;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      await this.pacer.acquire(parsed.host);
      try {
        const response = await this.fetchOnce(url, options);
        if (response.status === 429 || response.status >= 500) {
          const wait = retryAfterMs(response.headers) ?? backoffMs(attempt);
          if (attempt < retries) {
            this.log.debug(`${response.status} от ${parsed.host}, повтор через ${wait} мс`);
            await sleep(wait);
            continue;
          }
          throw new HttpError(`HTTP ${response.status}`, response.status, url);
        }
        if (response.ok) {
          await this.cache.set({ url, status: response.status, headers: response.headers, body: response.body });
        }
        return response;
      } catch (error) {
        lastError = error;
        if (error instanceof HttpError && error.status < 500 && error.status !== 429) throw error;
        if (attempt >= retries) break;
        await sleep(backoffMs(attempt));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Запрос не удался: ${url}`);
  }

  async json<T = unknown>(url: string, options: HttpRequestOptions = {}): Promise<T> {
    const response = await this.get(url, {
      ...options,
      headers: { accept: 'application/json', ...options.headers },
      // Публичные REST API отдают robots.txt, запрещающий всё подряд, хотя сами
      // предназначены для программного доступа. Для них проверка отключается явно.
      ignoreRobots: options.ignoreRobots ?? true,
    });
    if (!response.ok) throw new HttpError(`HTTP ${response.status}`, response.status, url);
    return JSON.parse(response.body) as T;
  }

  private async fetchOnce(url: string, options: HttpRequestOptions): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? this.config.timeoutMs);
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'ru,en;q=0.9',
          ...options.headers,
        },
      });
      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      return { url: response.url || url, status: response.status, ok: response.ok, body, headers, fromCache: false };
    } finally {
      clearTimeout(timer);
    }
  }

  private robotsFor(url: URL): Promise<RobotsPolicy> {
    const key = url.origin;
    const existing = this.robots.get(key);
    if (existing) return existing;

    const promise = (async (): Promise<RobotsPolicy> => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(`${url.origin}/robots.txt`, {
            headers: { 'user-agent': USER_AGENT },
            signal: controller.signal,
          });
          if (!response.ok) return ALLOW_ALL;
          return parseRobots(await response.text(), USER_AGENT);
        } finally {
          clearTimeout(timer);
        }
      } catch {
        return ALLOW_ALL;
      }
    })();

    this.robots.set(key, promise);
    return promise;
  }

  purgeCache(): Promise<void> {
    return this.cache.purge();
  }
}

function backoffMs(attempt: number): number {
  const base = 800 * 2 ** attempt;
  return base + Math.floor(Math.random() * 400);
}

function retryAfterMs(headers: Record<string, string>): number | undefined {
  const raw = headers['retry-after'];
  if (!raw) return undefined;
  const seconds = Number.parseInt(raw, 10);
  if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000);
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), 30_000);
  return undefined;
}
