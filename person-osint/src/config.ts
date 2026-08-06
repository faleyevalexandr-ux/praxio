export const TOOL_NAME = 'person-osint';
export const TOOL_VERSION = '0.1.0';

/**
 * User-Agent намеренно честный: инструмент представляется, а не маскируется под
 * браузер. Часть сайтов отдаёт таким клиентам меньше, зато не нарушается ToS и
 * администратор ресурса может связаться с нами.
 */
export const USER_AGENT =
  `${TOOL_NAME}/${TOOL_VERSION} (+https://github.com/faleyevalexandr-ux/praxio; OSINT research tool; respects robots.txt)`;

export interface RuntimeConfig {
  /** Сколько источников выполняется одновременно. */
  concurrency: number;
  /** Минимальный интервал между запросами к одному хосту, мс. */
  perHostDelayMs: number;
  /** Таймаут одного HTTP-запроса, мс. */
  timeoutMs: number;
  /** Число повторов при 429/5xx/сетевых ошибках. */
  retries: number;
  /** Максимум результатов от одного источника. */
  maxResultsPerSource: number;
  /** Сколько найденных страниц догружать для извлечения структурных данных. */
  enrichLimit: number;
  /** Кэшировать ответы на диск. По умолчанию выключено: это персональные данные. */
  cache: boolean;
  cacheDir: string;
  cacheTtlMs: number;
  /** Соблюдать robots.txt при обходе обычных веб-страниц. */
  respectRobots: boolean;
  /** Порог, ниже которого находка считается непроверенной. */
  confidenceThreshold: number;
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

export const DEFAULT_CONFIG: RuntimeConfig = {
  concurrency: 4,
  perHostDelayMs: 1200,
  timeoutMs: 15_000,
  retries: 2,
  maxResultsPerSource: 15,
  enrichLimit: 12,
  cache: false,
  cacheDir: '.cache',
  cacheTtlMs: 24 * 60 * 60 * 1000,
  respectRobots: true,
  confidenceThreshold: 0.45,
  logLevel: 'info',
};

/**
 * Домены, по которым строятся site:-дорки. Ключ — идентификатор площадки,
 * значение — домены и шаблон, по которому URL признаётся именно профилем,
 * а не случайной страницей сайта.
 */
export interface PlatformSpec {
  platform: string;
  label: string;
  domains: string[];
  /** URL профиля должен матчиться хотя бы одним паттерном. */
  profilePatterns: RegExp[];
  /** Извлечение ника из URL. */
  handleFrom?: RegExp;
  /** Априорная значимость площадки для идентификации человека. */
  prior: number;
}

export const PLATFORMS: PlatformSpec[] = [
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    domains: ['linkedin.com'],
    profilePatterns: [/linkedin\.com\/in\//i, /linkedin\.com\/pub\//i],
    handleFrom: /linkedin\.com\/in\/([^/?#]+)/i,
    prior: 0.95,
  },
  {
    platform: 'github',
    label: 'GitHub',
    domains: ['github.com'],
    profilePatterns: [/^https?:\/\/(www\.)?github\.com\/[^/?#]+\/?(\?|#|$)/i],
    handleFrom: /github\.com\/([^/?#]+)/i,
    prior: 0.85,
  },
  {
    platform: 'vk',
    label: 'ВКонтакте',
    domains: ['vk.com', 'vk.ru'],
    profilePatterns: [/^https?:\/\/(m\.|www\.)?vk\.(com|ru)\/[^/?#]+\/?(\?|#|$)/i],
    handleFrom: /vk\.(?:com|ru)\/([^/?#]+)/i,
    prior: 0.8,
  },
  {
    platform: 'telegram',
    label: 'Telegram',
    domains: ['t.me', 'telegram.me'],
    profilePatterns: [/^https?:\/\/(t|telegram)\.me\/[^/?#]+\/?(\?|#|$)/i],
    handleFrom: /(?:t|telegram)\.me\/([^/?#]+)/i,
    prior: 0.6,
  },
  {
    platform: 'x',
    label: 'X / Twitter',
    domains: ['twitter.com', 'x.com'],
    profilePatterns: [/^https?:\/\/(www\.)?(twitter|x)\.com\/[^/?#]+\/?(\?|#|$)/i],
    handleFrom: /(?:twitter|x)\.com\/([^/?#]+)/i,
    prior: 0.75,
  },
  {
    platform: 'habr',
    label: 'Habr',
    domains: ['habr.com'],
    profilePatterns: [/habr\.com\/[a-z-]+\/users\//i],
    handleFrom: /habr\.com\/[a-z-]+\/users\/([^/?#]+)/i,
    prior: 0.8,
  },
  {
    platform: 'medium',
    label: 'Medium',
    domains: ['medium.com'],
    profilePatterns: [/^https?:\/\/(www\.)?medium\.com\/@[^/?#]+\/?(\?|#|$)/i],
    handleFrom: /medium\.com\/@([^/?#]+)/i,
    prior: 0.6,
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    domains: ['youtube.com'],
    profilePatterns: [/youtube\.com\/(@|c\/|channel\/|user\/)/i],
    handleFrom: /youtube\.com\/@([^/?#]+)/i,
    prior: 0.6,
  },
  {
    platform: 'instagram',
    label: 'Instagram',
    domains: ['instagram.com'],
    profilePatterns: [/^https?:\/\/(www\.)?instagram\.com\/[^/?#]+\/?(\?|#|$)/i],
    handleFrom: /instagram\.com\/([^/?#]+)/i,
    prior: 0.6,
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    domains: ['facebook.com'],
    profilePatterns: [/facebook\.com\/(profile\.php|[^/?#]+)\/?(\?|#|$)/i],
    handleFrom: /facebook\.com\/([^/?#]+)/i,
    prior: 0.6,
  },
  {
    platform: 'stackoverflow',
    label: 'Stack Overflow',
    domains: ['stackoverflow.com'],
    profilePatterns: [/stackoverflow\.com\/users\/\d+/i],
    prior: 0.7,
  },
  {
    platform: 'scholar',
    label: 'Google Scholar',
    domains: ['scholar.google.com'],
    profilePatterns: [/scholar\.google\.com\/citations\?/i],
    prior: 0.85,
  },
  {
    platform: 'researchgate',
    label: 'ResearchGate',
    domains: ['researchgate.net'],
    profilePatterns: [/researchgate\.net\/profile\//i],
    prior: 0.8,
  },
  {
    platform: 'orcid',
    label: 'ORCID',
    domains: ['orcid.org'],
    profilePatterns: [/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/i],
    prior: 0.95,
  },
  {
    platform: 'hh',
    label: 'hh.ru',
    domains: ['hh.ru'],
    profilePatterns: [/hh\.ru\/resume\//i],
    prior: 0.7,
  },
  {
    platform: 'behance',
    label: 'Behance',
    domains: ['behance.net'],
    profilePatterns: [/^https?:\/\/(www\.)?behance\.net\/[^/?#]+\/?(\?|#|$)/i],
    handleFrom: /behance\.net\/([^/?#]+)/i,
    prior: 0.6,
  },
];

/**
 * Пути внутри доменов площадок, которые профилями не являются: служебные
 * разделы, ленты, справка. Без этого фильтра дорки собирают мусор.
 */
export const NON_PROFILE_PATH_SEGMENTS = new Set([
  'about', 'help', 'legal', 'privacy', 'terms', 'login', 'signup', 'search',
  'explore', 'settings', 'jobs', 'feed', 'company', 'pulse', 'posts', 'topics',
  'tags', 'features', 'pricing', 'blog', 'news', 'video', 'watch', 'share',
  'i', 'home', 'discover', 'sitemap', 'directory', 'dir', 'trending',
]);
