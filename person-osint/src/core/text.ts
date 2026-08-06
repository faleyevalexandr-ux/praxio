import type { NameVariants } from '../types.ts';

/** Приводит строку к сравнимому виду: без диакритики, регистра и пунктуации. */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    // NFD + снятие комбинирующих знаков схлопывает é→e, ё→е, й→и:
    // разнобой в написании одного имени перестаёт мешать сравнению.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalize(input);
  return normalized ? normalized.split(' ').filter(Boolean) : [];
}

export function hasCyrillic(input: string): boolean {
  return /[\u0400-\u04ff]/.test(input);
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Базовая транслитерация (близка к ICAO/загранпаспорту). */
export function translit(input: string): string {
  let out = '';
  for (const char of input.toLowerCase()) {
    out += TRANSLIT[char] ?? char;
  }
  return out;
}

/**
 * Альтернативные написания одного и того же слова латиницей. В вебе одно имя
 * встречается сразу в нескольких вариантах, и без них половина совпадений теряется.
 */
export function translitVariants(input: string): string[] {
  const base = translit(input);
  const variants = new Set<string>([base]);

  // -ий / -ый на конце: Дмитрий → dmitriy / dmitri / dmitry
  if (/(ий|ый)$/.test(input.toLowerCase())) {
    const stem = base.replace(/(iy|yy)$/, '');
    variants.add(`${stem}i`);
    variants.add(`${stem}y`);
  }
  // х → h вместо kh (Михаил → mihail)
  if (base.includes('kh')) variants.add(base.replace(/kh/g, 'h'));
  // я/ю в начале и середине: Наталья → natalia
  if (base.includes('ya')) variants.add(base.replace(/ya/g, 'ia'));
  if (base.includes('yu')) variants.add(base.replace(/yu/g, 'iu'));
  // е после согласной часто пишут как ye: Евгений → yevgeniy
  if (/^e/.test(base)) variants.add(`y${base}`);
  // ц → c вместо ts
  if (base.includes('ts')) variants.add(base.replace(/ts/g, 'c'));

  return [...variants].filter(Boolean);
}

const PATRONYMIC = /(ович|евич|ьич|инич|овна|евна|ична|инична)$/i;

const SURNAME_SUFFIX =
  /(ов|ев|ёв|ин|ын|ский|цкий|ской|цкой|ова|ева|ёва|ина|ына|ская|цкая|ко|ук|юк|швили|дзе|ян|оглы|ых|их)$/i;

interface ParsedName {
  given?: string;
  surname?: string;
  patronymic?: string;
  /** Токены в исходном регистре и порядке. */
  raw: string[];
}

/**
 * Разбирает ФИО. Порядок токенов в реальных данных произвольный, поэтому
 * опорой служит отчество (однозначно опознаётся по суффиксу), а при его
 * отсутствии — суффикс фамилии. Если сигналов нет, принимается порядок
 * «Имя Фамилия» как наиболее частый в вебе.
 */
export function parseName(fullName: string): ParsedName {
  const raw = fullName.trim().split(/[\s,]+/).filter(Boolean);
  if (raw.length === 0) return { raw };
  if (raw.length === 1) return { raw, surname: raw[0] };

  const patronymicIndex = raw.findIndex((t) => PATRONYMIC.test(t));
  const patronymic = patronymicIndex >= 0 ? raw[patronymicIndex] : undefined;
  const rest = raw.filter((_, i) => i !== patronymicIndex);

  if (rest.length === 1) {
    return { raw, surname: rest[0], ...(patronymic ? { patronymic } : {}) };
  }

  const first = rest[0]!;
  const last = rest[rest.length - 1]!;

  let given = first;
  let surname = last;

  if (patronymicIndex === raw.length - 1 || (patronymicIndex === 1 && raw.length === 3)) {
    // «Имя Отчество Фамилия» либо «Имя Фамилия Отчество» — имя в начале.
    given = first;
    surname = last;
  }
  if (patronymicIndex === 1 && raw.length === 3 && SURNAME_SUFFIX.test(first) && !SURNAME_SUFFIX.test(last)) {
    // «Фамилия Отчество Имя» встречается в реестрах.
    given = last;
    surname = first;
  }
  if (patronymicIndex !== 1 && SURNAME_SUFFIX.test(first) && !SURNAME_SUFFIX.test(last)) {
    // «Петров Иван» — фамилия впереди.
    given = last;
    surname = first;
  }

  return { raw, given, surname, ...(patronymic ? { patronymic } : {}) };
}

/** Строит все формы имени: для поисковых запросов и для проверки вхождений. */
export function buildNameVariants(fullName: string): NameVariants {
  const parsed = parseName(fullName);
  const original = fullName.trim();
  const tokens = tokenize(original);

  const queryForms = new Set<string>();
  const matchForms = new Set<string>();
  const initialForms = new Set<string>();

  const add = (value: string | undefined, toQuery = true) => {
    if (!value) return;
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (trimmed.split(' ').length < 2) return;
    if (toQuery) queryForms.add(trimmed);
    matchForms.add(normalize(trimmed));
  };

  add(original);

  const { given, surname, patronymic } = parsed;
  if (given && surname) {
    add(`${given} ${surname}`);
    add(`${surname} ${given}`);
    if (patronymic) {
      add(`${given} ${patronymic} ${surname}`);
      add(`${surname} ${given} ${patronymic}`);
    }
  }

  // Латинские формы для кириллических имён и наоборот — только в одну сторону:
  // обратная транслитерация неоднозначна и порождает мусор.
  if (hasCyrillic(original) && given && surname) {
    for (const g of translitVariants(given)) {
      for (const s of translitVariants(surname)) {
        add(`${g} ${s}`);
        matchForms.add(normalize(`${s} ${g}`));
      }
    }
  }

  if (given && surname) {
    const gi = [...given][0];
    const si = [...surname][0];
    if (gi) {
      initialForms.add(normalize(`${gi} ${surname}`));
      initialForms.add(normalize(`${surname} ${gi}`));
    }
    if (si && hasCyrillic(original)) {
      const tg = translit(given);
      initialForms.add(normalize(`${[...tg][0]} ${translit(surname)}`));
    }
  }

  return {
    original,
    tokens,
    ...(surname ? { surname } : {}),
    ...(given ? { given } : {}),
    ...(patronymic ? { patronymic } : {}),
    queryForms: [...queryForms],
    matchForms: [...matchForms],
    initialForms: [...initialForms],
  };
}

/** Расстояние Левенштейна с ранним выходом по порогу. */
export function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(current[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + cost);
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * Совпадение отдельного токена с учётом русского словоизменения:
 * «Петрову», «Петрова» и «Петров» — одно и то же слово.
 */
export function tokenMatches(candidate: string, reference: string): boolean {
  if (candidate === reference) return true;
  if (reference.length < 4) return false;
  const stem = reference.slice(0, Math.max(4, Math.ceil(reference.length * 0.75)));
  if (candidate.startsWith(stem) && Math.abs(candidate.length - reference.length) <= 3) return true;
  return reference.length >= 5 && levenshtein(candidate, reference, 1) <= 1;
}

/**
 * Ищет имя в тексте. Возвращает 1 для точного вхождения полной формы,
 * 0.75 — если все токены имени присутствуют рядом, 0.5 — инициальная форма,
 * 0 — не найдено.
 */
export function nameMatchScore(text: string, names: NameVariants): number {
  const haystack = normalize(text);
  if (!haystack) return 0;

  for (const form of names.matchForms) {
    if (form && haystack.includes(form)) return 1;
  }

  const required = [names.given, names.surname].filter(Boolean).map((v) => normalize(v!));
  if (required.length === 2) {
    const words = haystack.split(' ');
    const positions = required.map((ref) => words.findIndex((w) => tokenMatches(w, ref)));
    if (positions.every((p) => p >= 0)) {
      const spread = Math.abs(positions[0]! - positions[1]!);
      return spread <= 3 ? 0.75 : 0.55;
    }
  }

  for (const form of names.initialForms) {
    if (form && haystack.includes(form)) return 0.5;
  }

  return 0;
}

/** Мягкая проверка вхождения уточнителя (города, компании) в текст. */
export function containsHint(text: string, hint: string | undefined): boolean {
  if (!hint) return false;
  const haystack = normalize(text);
  const hintTokens = tokenize(hint).filter((t) => t.length >= 3);
  if (hintTokens.length === 0) return false;
  const words = haystack.split(' ');
  const matched = hintTokens.filter((token) => words.some((w) => tokenMatches(w, token)));
  return matched.length / hintTokens.length >= 0.6;
}

/** Схлопывает пробелы и обрезает строку до предела, не разрывая слово. */
export function truncate(input: string, limit = 300): string {
  const clean = input.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}
