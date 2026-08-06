import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface CacheEntry {
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  storedAt: number;
}

/**
 * Файловый кэш HTTP-ответов. Выключен по умолчанию: содержимое — персональные
 * данные, и оставлять его на диске нужно осознанно (флаг `--cache`).
 */
export class ResponseCache {
  private readonly dir: string;
  private readonly ttlMs: number;
  private readonly enabled: boolean;

  constructor(dir: string, ttlMs: number, enabled: boolean) {
    this.dir = dir;
    this.ttlMs = ttlMs;
    this.enabled = enabled;
  }

  private path(url: string): string {
    const key = createHash('sha256').update(url).digest('hex').slice(0, 32);
    return join(this.dir, `${key}.json`);
  }

  async get(url: string): Promise<CacheEntry | undefined> {
    if (!this.enabled) return undefined;
    try {
      const raw = await readFile(this.path(url), 'utf8');
      const entry = JSON.parse(raw) as CacheEntry;
      if (Date.now() - entry.storedAt > this.ttlMs) return undefined;
      return entry;
    } catch {
      return undefined;
    }
  }

  async set(entry: Omit<CacheEntry, 'storedAt'>): Promise<void> {
    if (!this.enabled) return;
    try {
      await mkdir(this.dir, { recursive: true });
      const payload: CacheEntry = { ...entry, storedAt: Date.now() };
      await writeFile(this.path(entry.url), JSON.stringify(payload), 'utf8');
    } catch {
      /* кэш — оптимизация, его отказ не должен ронять прогон */
    }
  }

  async purge(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true });
  }
}
