import { clamp, scoreHit } from '../core/score.ts';
import { truncate } from '../core/text.ts';
import type { Fact, Source, SourceYield } from '../types.ts';
import { emptyYield, evidence, tolerate } from './_shared.ts';

const ID = 'github';
const API = 'https://api.github.com';

interface UserSearchResponse {
  items?: Array<{ login?: string; html_url?: string; avatar_url?: string }>;
}

interface UserResponse {
  login?: string;
  name?: string | null;
  company?: string | null;
  blog?: string | null;
  location?: string | null;
  bio?: string | null;
  email?: string | null;
  twitter_username?: string | null;
  avatar_url?: string | null;
  html_url?: string | null;
  public_repos?: number;
  followers?: number;
  created_at?: string;
}

/**
 * Поиск по GitHub без токена: лимит 10 запросов в минуту, поэтому берём
 * немного кандидатов и подробно разбираем только их. Профиль GitHub полезен
 * тем, что содержит заполненные самим человеком поля: компанию, город, сайт.
 */
export const githubSource: Source = {
  id: ID,
  name: 'GitHub',
  category: 'code',
  description: 'Профили разработчиков: компания, город, личный сайт, связанные аккаунты',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, log, startedAt } = ctx;
    const result = emptyYield();

    const queries = names.queryForms.slice(0, 2).map((form) => {
      const parts = [`${form} in:name`];
      if (target.city) parts.push(`location:${quoteIfNeeded(target.city)}`);
      return parts.join(' ');
    });
    if (target.city) queries.push(...names.queryForms.slice(0, 1).map((f) => `${f} in:name`));

    const logins = new Set<string>();

    for (const query of [...new Set(queries)].slice(0, 3)) {
      const data = await tolerate(
        () =>
          http.json<UserSearchResponse>(
            `${API}/search/users?${new URLSearchParams({ q: query, per_page: '8' })}`,
            { headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' } },
          ),
        {} as UserSearchResponse,
      );
      for (const item of data.items ?? []) {
        if (item.login) logins.add(item.login);
      }
      if (logins.size >= 8) break;
    }

    for (const login of [...logins].slice(0, 8)) {
      const user = await tolerate(
        () =>
          http.json<UserResponse>(`${API}/users/${encodeURIComponent(login)}`, {
            headers: { accept: 'application/vnd.github+json' },
          }),
        undefined as UserResponse | undefined,
      );
      if (!user?.html_url) continue;

      const context = [user.name, user.company, user.location, user.bio, user.blog]
        .filter(Boolean)
        .join(' · ');

      const { confidence, signals } = scoreHit(
        { url: user.html_url, title: user.name ?? login, snippet: context, sourcePrior: 0.65 },
        target,
        names,
      );
      if (confidence === 0) {
        log.debug(`github: ${login} отброшен, имя не совпало`);
        continue;
      }

      const ev = [evidence(ID, user.html_url, startedAt, user.name ?? login, truncate(context, 300))];

      result.profiles.push({
        platform: 'github',
        url: user.html_url,
        handle: login,
        ...(user.name ? { displayName: user.name } : {}),
        title: user.name ?? login,
        snippet: truncate(context, 300),
        confidence: clamp(confidence),
        signals: [...signals, `репозиториев: ${user.public_repos ?? 0}, подписчиков: ${user.followers ?? 0}`],
        evidence: ev,
      });

      const facts: Array<[Fact['kind'], string | null | undefined, string]> = [
        ['employer', user.company?.replace(/^@/, ''), 'поле «company» в профиле'],
        ['location', user.location, 'поле «location» в профиле'],
        ['website', user.blog, 'личный сайт из профиля'],
        ['bio', user.bio, 'описание профиля'],
        // Email в профиле GitHub человек публикует сам и осознанно — это
        // открытые контактные данные, а не результат вскрытия.
        ['identifier', user.email ? `email: ${user.email}` : undefined, 'публичный email в профиле'],
        ['alias', user.twitter_username ? `@${user.twitter_username} (X/Twitter)` : undefined, 'связанный аккаунт'],
      ];

      for (const [kind, value, signal] of facts) {
        if (!value) continue;
        result.facts.push({
          kind,
          value: truncate(String(value), 200),
          confidence: clamp(confidence),
          signals: [...signals, signal],
          evidence: ev,
        });
      }

      if (user.twitter_username) {
        const url = `https://x.com/${user.twitter_username}`;
        result.profiles.push({
          platform: 'x',
          url,
          handle: user.twitter_username,
          confidence: clamp(confidence - 0.05),
          signals: [...signals, 'аккаунт указан в профиле GitHub'],
          evidence: [evidence(ID, user.html_url, startedAt, `связанный аккаунт @${user.twitter_username}`)],
        });
      }
    }

    return result;
  },
};

function quoteIfNeeded(value: string): string {
  return value.includes(' ') ? `"${value}"` : value;
}
