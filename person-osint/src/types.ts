/**
 * Доменная модель. Ключевой принцип: ни один факт не существует без ссылки на
 * источник. Любое утверждение в отчёте можно открыть в браузере и перепроверить.
 */

/** Кого ищем. Всё, кроме имени, — опциональные уточнители. */
export interface Target {
  /** ФИО в свободной форме: «Иван Петров», «Petrov Ivan», «Иван Сергеевич Петров». */
  fullName: string;
  /** Город или регион — сильный дизамбигуатор для распространённых имён. */
  city?: string;
  /** Компания, ВУЗ или организация. */
  company?: string;
  /** Двухбуквенный код страны (ISO 3166-1 alpha-2), влияет на выбор языковых источников. */
  country?: string;
  /** Произвольные дополнительные слова-маркеры: должность, специальность, ник. */
  keywords: string[];
  /** Свободное описание цели сбора — попадает в отчёт как audit trail. */
  purpose?: string;
}

/** Ссылка на первоисточник конкретного утверждения. */
export interface Evidence {
  sourceId: string;
  url: string;
  title?: string;
  snippet?: string;
  /** ISO-8601, момент получения. Веб меняется — дата обязательна. */
  retrievedAt: string;
}

export type FactKind =
  | 'alias'
  | 'jobTitle'
  | 'employer'
  | 'location'
  | 'education'
  | 'website'
  | 'image'
  | 'bio'
  | 'identifier'
  | 'birthDate';

/** Атомарное утверждение о человеке. */
export interface Fact {
  kind: FactKind;
  value: string;
  /** 0..1 — насколько мы уверены, что факт относится именно к искомому человеку. */
  confidence: number;
  /** Человекочитаемое обоснование оценки. */
  signals: string[];
  evidence: Evidence[];
}

/** Найденный профиль на площадке. */
export interface ProfileHit {
  /** Нормализованный идентификатор площадки: github, linkedin, vk, telegram... */
  platform: string;
  url: string;
  handle?: string;
  displayName?: string;
  title?: string;
  snippet?: string;
  confidence: number;
  signals: string[];
  evidence: Evidence[];
}

export type DocumentKind = 'news' | 'paper' | 'post' | 'page';

/** Найденный документ: статья, публикация, пост, произвольная веб-страница. */
export interface DocumentHit {
  kind: DocumentKind;
  title: string;
  url: string;
  snippet?: string;
  /** ISO-8601 или год публикации, как отдал источник. */
  published?: string;
  authors?: string[];
  venue?: string;
  confidence: number;
  signals: string[];
  evidence: Evidence[];
}

/** То, что возвращает отдельный источник. */
export interface SourceYield {
  profiles: ProfileHit[];
  documents: DocumentHit[];
  facts: Fact[];
}

export type SourceCategory =
  | 'search'
  | 'social'
  | 'academic'
  | 'code'
  | 'news'
  | 'forum'
  | 'encyclopedia';

export interface SourceContext {
  target: Target;
  names: NameVariants;
  http: HttpLike;
  log: LoggerLike;
  /** Верхняя граница числа результатов, которые источник должен вернуть. */
  maxResults: number;
  /** Момент запуска прогона (ISO), чтобы все Evidence были согласованы по времени. */
  startedAt: string;
}

export interface Source {
  id: string;
  name: string;
  category: SourceCategory;
  /** Короткое описание для `person-osint sources`. */
  description: string;
  /** Все источники в этом проекте — без ключей. Флаг оставлен для будущих расширений. */
  needsKey: false;
  run(ctx: SourceContext): Promise<SourceYield>;
}

/** Итог работы одного источника, включая диагностику. */
export interface SourceRunReport {
  id: string;
  name: string;
  category: SourceCategory;
  ok: boolean;
  error?: string;
  durationMs: number;
  hits: number;
}

export interface Ambiguity {
  /** true, если сигналов различить однофамильцев недостаточно. */
  commonNameWarning: boolean;
  /** Оценка числа разных людей, попавших в выдачу. */
  distinctCandidatesEstimate: number;
  notes: string[];
}

export interface Report {
  tool: { name: string; version: string };
  target: Target;
  generatedAt: string;
  durationMs: number;
  sources: SourceRunReport[];
  profiles: ProfileHit[];
  documents: DocumentHit[];
  facts: Fact[];
  ambiguity: Ambiguity;
  stats: {
    totalProfiles: number;
    totalDocuments: number;
    totalFacts: number;
    highConfidence: number;
    sourcesOk: number;
    sourcesFailed: number;
  };
}

/** Варианты написания имени, по которым строятся запросы. */
export interface NameVariants {
  /** Исходная строка как её ввёл пользователь. */
  original: string;
  /** Токены имени в нижнем регистре без диакритики. */
  tokens: string[];
  /** Фамилия по эвристике (для кириллицы — по суффиксу, иначе последний токен). */
  surname?: string;
  given?: string;
  patronymic?: string;
  /** Полный список строк для поисковых запросов, по убыванию точности. */
  queryForms: string[];
  /** Формы для проверки вхождения в текст (нормализованные, включая транслит). */
  matchForms: string[];
  /** Инициальные формы: «и. петров», «petrov i.». */
  initialForms: string[];
}

/* --- Структурные типы, чтобы источники не зависели от конкретных реализаций --- */

export interface HttpResponse {
  url: string;
  status: number;
  ok: boolean;
  body: string;
  headers: Record<string, string>;
  fromCache: boolean;
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  /** Пропустить проверку robots.txt. Применяется только к официальным API. */
  ignoreRobots?: boolean;
  /** Не логировать тело при ошибке (для источников с персональными данными). */
  quiet?: boolean;
}

export interface HttpLike {
  get(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
  json<T = unknown>(url: string, options?: HttpRequestOptions): Promise<T>;
}

export interface LoggerLike {
  debug(msg: string, ...rest: unknown[]): void;
  info(msg: string, ...rest: unknown[]): void;
  warn(msg: string, ...rest: unknown[]): void;
  error(msg: string, ...rest: unknown[]): void;
}
