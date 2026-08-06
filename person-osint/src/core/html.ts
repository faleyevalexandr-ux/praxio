import * as cheerio from 'cheerio';
import { truncate } from './text.ts';

export interface PageMeta {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  image?: string;
  /** Значения из JSON-LD schema.org/Person, если страница их отдаёт. */
  person?: PersonMarkup;
  /** Ссылки на другие профили того же человека (rel=me, sameAs, ссылки в шапке). */
  sameAs: string[];
  /** Видимый текст страницы, обрезанный до разумного объёма. */
  text: string;
}

export interface PersonMarkup {
  name?: string;
  jobTitle?: string;
  worksFor?: string;
  address?: string;
  alumniOf?: string;
  description?: string;
  image?: string;
  url?: string;
  sameAs: string[];
}

/** Разбирает HTML-страницу: og-теги, JSON-LD, rel=me и видимый текст. */
export function extractPageMeta(html: string, url: string): PageMeta {
  const $ = cheerio.load(html);

  const meta = (selector: string): string | undefined => {
    const value = $(selector).attr('content');
    return value?.trim() || undefined;
  };

  const sameAs = new Set<string>();
  $('a[rel~="me"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) sameAs.add(absolute(href, url));
  });

  const person = extractPersonLd($);
  for (const link of person?.sameAs ?? []) sameAs.add(link);

  $('script, style, noscript, svg, iframe').remove();
  const text = truncate($('body').text(), 4000);

  return {
    url,
    title: $('title').first().text().trim() || meta('meta[property="og:title"]') || undefined,
    description:
      meta('meta[name="description"]') ??
      meta('meta[property="og:description"]') ??
      meta('meta[name="twitter:description"]'),
    siteName: meta('meta[property="og:site_name"]'),
    image: meta('meta[property="og:image"]'),
    ...(person ? { person } : {}),
    sameAs: [...sameAs],
    text,
  };
}

/**
 * Ищет в JSON-LD объект типа Person. Разметка в дикой природе бывает объектом,
 * массивом или графом (@graph), поэтому обход рекурсивный.
 */
function extractPersonLd($: cheerio.CheerioAPI): PersonMarkup | undefined {
  const blocks = $('script[type="application/ld+json"]')
    .toArray()
    .map((el) => $(el).text());

  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }
    const person = findPerson(parsed);
    if (person) return person;
  }
  return undefined;
}

function findPerson(node: unknown, depth = 0): PersonMarkup | undefined {
  if (depth > 6 || node === null || typeof node !== 'object') return undefined;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findPerson(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  const record = node as Record<string, unknown>;
  const type = record['@type'];
  const types = Array.isArray(type) ? type.map(String) : typeof type === 'string' ? [type] : [];

  if (types.some((t) => t.toLowerCase() === 'person')) {
    const sameAs = toStringArray(record['sameAs']);
    return {
      ...pick(record, 'name'),
      ...pick(record, 'jobTitle'),
      ...pick(record, 'description'),
      ...pick(record, 'url'),
      ...(flatten(record['worksFor']) ? { worksFor: flatten(record['worksFor'])! } : {}),
      ...(flatten(record['address']) ? { address: flatten(record['address'])! } : {}),
      ...(flatten(record['alumniOf']) ? { alumniOf: flatten(record['alumniOf'])! } : {}),
      ...(flatten(record['image']) ? { image: flatten(record['image'])! } : {}),
      sameAs,
    };
  }

  for (const value of Object.values(record)) {
    const found = findPerson(value, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function pick(record: Record<string, unknown>, key: string): Record<string, string> {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? { [key]: value.trim() } : {};
}

/** Значения schema.org бывают строкой, объектом с name или массивом таких. */
function flatten(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = flatten(item);
      if (found) return found;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['name', 'legalName', 'addressLocality', 'url', 'contentUrl']) {
      const found = flatten(record[key]);
      if (found) return found;
    }
  }
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}

function absolute(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/** Убирает трекинговые параметры и якоря — иначе один URL двоится в отчёте. */
export function canonicalUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|yclid|ref|ref_src|_ga|mc_cid|mc_eid|si)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return input;
  }
}
