import { NON_PROFILE_PATH_SEGMENTS, PLATFORMS, type PlatformSpec } from '../config.ts';
import type { NameVariants, Target } from '../types.ts';
import { containsHint, nameMatchScore, normalize, tokenMatches } from './text.ts';

export interface ScoreInput {
  url: string;
  title?: string;
  snippet?: string;
  /** Дополнительный текст: тело страницы, био, аннотация. */
  body?: string;
  /** Априорная уверенность источника: официальное API надёжнее веб-выдачи. */
  sourcePrior?: number;
}

export interface ScoreResult {
  confidence: number;
  signals: string[];
}

/**
 * Оценивает, относится ли находка к искомому человеку.
 *
 * Совпадение имени — необходимое условие: без него результат отбрасывается,
 * каким бы ни был остальной контекст. Город и работодатель поднимают оценку,
 * потому что именно они разводят однофамильцев. Площадка даёт небольшую
 * поправку: персональная страница на LinkedIn информативнее случайного форума.
 */
export function scoreHit(input: ScoreInput, target: Target, names: NameVariants): ScoreResult {
  const haystack = [input.title, input.snippet, input.body].filter(Boolean).join(' \n ');
  const signals: string[] = [];

  const nameScore = Math.max(
    nameMatchScore(haystack, names),
    nameMatchScore(decodeUrlWords(input.url), names) * 0.9,
  );

  if (nameScore === 0) {
    return { confidence: 0, signals: ['имя не найдено ни в тексте, ни в URL'] };
  }
  if (nameScore >= 1) signals.push('точное совпадение имени');
  else if (nameScore >= 0.75) signals.push('имя и фамилия рядом в тексте');
  else if (nameScore >= 0.5) signals.push('совпадение по инициалам');
  else signals.push('имя и фамилия найдены порознь');

  let confidence = 0.3 + nameScore * 0.35;

  if (containsHint(haystack, target.city)) {
    confidence += 0.18;
    signals.push(`упомянут город: ${target.city}`);
  }
  if (containsHint(haystack, target.company)) {
    confidence += 0.22;
    signals.push(`упомянута организация: ${target.company}`);
  }

  const matchedKeywords = target.keywords.filter((kw) => containsHint(haystack, kw));
  if (matchedKeywords.length) {
    confidence += Math.min(0.12, matchedKeywords.length * 0.06);
    signals.push(`совпали уточнители: ${matchedKeywords.join(', ')}`);
  }

  const platform = detectPlatform(input.url);
  if (platform) {
    confidence += (platform.prior - 0.5) * 0.2;
    signals.push(`площадка: ${platform.label}`);
  }

  if (input.sourcePrior !== undefined) {
    confidence += (input.sourcePrior - 0.5) * 0.2;
  }

  // Однофамильцы без единого уточнителя — самый частый источник ложных
  // срабатываний, поэтому потолок для таких находок занижен принудительно.
  const hasDisambiguator =
    containsHint(haystack, target.city) || containsHint(haystack, target.company) || matchedKeywords.length > 0;
  if (!hasDisambiguator && (target.city || target.company)) {
    confidence = Math.min(confidence, 0.62);
    signals.push('нет подтверждения по городу или организации');
  }

  return { confidence: clamp(confidence), signals };
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function detectPlatform(url: string): PlatformSpec | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return undefined;
  }
  return PLATFORMS.find((spec) => spec.domains.some((d) => host === d || host.endsWith(`.${d}`)));
}

/** true, если URL похож на страницу профиля, а не на служебный раздел сайта. */
export function looksLikeProfileUrl(url: string): boolean {
  const platform = detectPlatform(url);
  if (!platform) return false;
  if (!platform.profilePatterns.some((re) => re.test(url))) return false;

  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const first = segments[0]?.toLowerCase().replace(/^@/, '');
    if (first && NON_PROFILE_PATH_SEGMENTS.has(first)) return false;
    const last = segments[segments.length - 1]?.toLowerCase().replace(/^@/, '');
    if (last && NON_PROFILE_PATH_SEGMENTS.has(last)) return false;
  } catch {
    return false;
  }
  return true;
}

export function extractHandle(url: string): string | undefined {
  const platform = detectPlatform(url);
  if (!platform?.handleFrom) return undefined;
  const match = platform.handleFrom.exec(url);
  const handle = match?.[1];
  return handle ? decodeURIComponent(handle) : undefined;
}

/**
 * Ник в URL часто и есть имя человека: `/in/ivan-petrov-1a2b3`.
 * Возвращает разделённые слова, пригодные для сравнения с именем.
 */
export function decodeUrlWords(url: string): string {
  try {
    const parsed = new URL(url);
    const decoded = decodeURIComponent(parsed.pathname + ' ' + parsed.searchParams.toString());
    return decoded.replace(/[-_+./?&=]+/g, ' ').replace(/\d+/g, ' ');
  } catch {
    return '';
  }
}

/**
 * Грубая оценка числа разных людей в выдаче: находки группируются по паре
 * «организация/город», найденной в тексте. Точная кластеризация тут невозможна,
 * задача — честно предупредить пользователя об омонимии.
 */
export function estimateDistinctPeople(texts: string[], names: NameVariants): number {
  const contexts = new Set<string>();
  const surname = names.surname ? normalize(names.surname) : '';

  for (const text of texts) {
    const words = normalize(text).split(' ');
    const index = words.findIndex((w) => surname && tokenMatches(w, surname));
    if (index < 0) continue;
    const around = words.slice(Math.max(0, index - 6), index + 7).filter((w) => w.length >= 5);
    const key = around.slice(0, 3).sort().join('|');
    if (key) contexts.add(key);
  }
  return Math.max(1, Math.min(contexts.size, 12));
}
