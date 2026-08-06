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

/** Группирует записанные запросы по хостам для читаемого вывода. */
export function groupByHost(requests: string[]): Array<{ host: string; urls: string[] }> {
  const byHost = new Map<string, string[]>();

  for (const url of requests) {
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      host = '(некорректный URL)';
    }
    const list = byHost.get(host) ?? [];
    if (!list.includes(url)) list.push(url);
    byHost.set(host, list);
  }

  return [...byHost.entries()]
    .map(([host, urls]) => ({ host, urls }))
    .sort((a, b) => b.urls.length - a.urls.length || a.host.localeCompare(b.host));
}

/** Достаёт поисковый запрос из URL, чтобы показать его в человекочитаемом виде. */
export function describeQuery(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('q') ?? parsed.searchParams.get('query') ?? parsed.searchParams.get('search') ?? undefined;
  } catch {
    return undefined;
  }
}
