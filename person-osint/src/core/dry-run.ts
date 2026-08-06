import type { HttpLike, HttpRequestOptions, HttpResponse } from '../types.ts';

/**
 * Клиент, который ничего не запрашивает, а записывает, что было бы запрошено.
 *
 * Подменяется на месте обычного HTTP-клиента, поэтому план получается не
 * декларативным, а фактическим: источники реально проходят свою логику и
 * формируют настоящие URL. Ограничение честное — многошаговые источники
 * (сначала поиск, потом карточка найденного) покажут только первый шаг,
 * потому что второй зависит от данных, которых в сухом прогоне нет.
 */
/**
 * Успешный ответ с пустой, но узнаваемой выдачей. Моделирует ветку «запрос
 * прошёл, ничего не нашлось» — именно её надо предполагать при построении
 * плана. Иначе источники уходят в аварийные обходные пути (запасной эндпоинт,
 * повтор), и план показывает запросы, которых в обычной работе не будет.
 */
const EMPTY_RESULT_PAGE = '<html><body><div id="links" class="results"></div></body></html>';

export class DryRunHttpClient implements HttpLike {
  readonly requests: string[] = [];

  async get(url: string, _options?: HttpRequestOptions): Promise<HttpResponse> {
    this.requests.push(url);
    return { url, status: 200, ok: true, body: EMPTY_RESULT_PAGE, headers: {}, fromCache: false };
  }

  async json<T = unknown>(url: string, _options?: HttpRequestOptions): Promise<T> {
    this.requests.push(url);
    throw new DryRunError(url);
  }
}

export class DryRunError extends Error {
  constructor(url: string) {
    super(`сухой прогон: запрос не отправлен (${url})`);
    this.name = 'DryRunError';
  }
}

export interface PlanEntry {
  /** Человекочитаемая подпись: поисковая фраза либо сам адрес. */
  label: string;
  /** Сколько запросов сворачивается в эту подпись. */
  count: number;
}

export interface PlanGroup {
  host: string;
  /** Всего запросов к хосту. */
  total: number;
  entries: PlanEntry[];
}

/**
 * Группирует запросы по хостам и сворачивает одинаковые подписи.
 *
 * Один и тот же поисковый запрос уходит по нескольку раз с разными
 * параметрами — Wikidata опрашивается на двух языках, Google News по двум
 * локалям. Без свёртки строки выглядят дублями, хотя запросы разные.
 */
export function groupByHost(requests: string[]): PlanGroup[] {
  const byHost = new Map<string, Set<string>>();

  for (const url of requests) {
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      host = '(некорректный URL)';
    }
    const set = byHost.get(host) ?? new Set<string>();
    set.add(url);
    byHost.set(host, set);
  }

  return [...byHost.entries()]
    .map(([host, urls]) => {
      const byLabel = new Map<string, number>();
      for (const url of urls) {
        const label = describeQuery(url) ?? url;
        byLabel.set(label, (byLabel.get(label) ?? 0) + 1);
      }
      return {
        host,
        total: urls.size,
        entries: [...byLabel.entries()].map(([label, count]) => ({ label, count })),
      };
    })
    .sort((a, b) => b.total - a.total || a.host.localeCompare(b.host));
}

/** Имена параметров, в которых у используемых API лежит поисковая фраза. */
const QUERY_PARAMS = ['q', 'query', 'search', 'query.author', 'inname', 'ids'];

/** Достаёт поисковый запрос из URL, чтобы показать его в человекочитаемом виде. */
export function describeQuery(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    for (const name of QUERY_PARAMS) {
      const value = parsed.searchParams.get(name);
      if (value) return value;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
