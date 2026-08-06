import type { HttpLike, HttpResponse, LoggerLike } from '../src/types.ts';

export interface Route {
  /** Подстрока или регулярное выражение, по которому подбирается ответ. */
  match: string | RegExp;
  body: string;
  status?: number;
}

/** HTTP-клиент, отвечающий из заранее заданных заготовок: тесты не ходят в сеть. */
export function fakeHttp(routes: Route[]): HttpLike & { calls: string[] } {
  const calls: string[] = [];

  const respond = (url: string): HttpResponse => {
    calls.push(url);
    const route = routes.find((r) =>
      typeof r.match === 'string' ? url.includes(r.match) : r.match.test(url),
    );
    if (!route) {
      return { url, status: 404, ok: false, body: '', headers: {}, fromCache: false };
    }
    const status = route.status ?? 200;
    return { url, status, ok: status < 400, body: route.body, headers: {}, fromCache: false };
  };

  return {
    calls,
    async get(url) {
      return respond(url);
    },
    async json<T>(url: string) {
      const response = respond(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} для ${url}`);
      return JSON.parse(response.body) as T;
    },
  };
}

export const silentLogger: LoggerLike = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
