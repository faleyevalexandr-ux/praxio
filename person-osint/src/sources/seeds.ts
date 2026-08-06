import { buildQuery, searchDuckDuckGo } from '../core/ddg.ts';
import { canonicalUrl } from '../core/html.ts';
import {
  clamp,
  detectPlatform,
  extractHandle,
  looksLikeProfileUrl,
  profileIdentityUrl,
  scoreHit,
} from '../core/score.ts';
import type { Source, SourceYield } from '../types.ts';
import { emptyYield, evidence } from './_shared.ts';

const ID = 'seeds';

/** Ники короче этого искать бессмысленно: выдача будет случайной. */
const MIN_HANDLE_LENGTH = 5;

/**
 * Точки опоры: адреса профилей, которые уже известны и переданы при запуске.
 *
 * Сам по себе источник в сеть почти не ходит — он превращает переданные ссылки
 * в находки высокой уверенности, а дальше работают другие стадии: догрузка
 * страницы вытащит rel="me" и sameAs, то есть связанные аккаунты, заявленные
 * самим человеком. Дополнительно ник ищется по вебу: один и тот же ник на
 * разных площадках — обычное дело и самый дешёвый способ найти их.
 *
 * Уверенность здесь высокая, но не полная: утверждение «это его профиль»
 * исходит от пользователя, инструмент его не проверял.
 */
export const seedProfilesSource: Source = {
  id: ID,
  name: 'Заданные профили',
  category: 'social',
  description: 'Раскрутка известных адресов профилей: связанные аккаунты и поиск по нику',
  needsKey: false,

  async run(ctx): Promise<SourceYield> {
    const { target, names, http, log, startedAt } = ctx;
    const result = emptyYield();

    const seeds = target.knownProfiles ?? [];
    if (seeds.length === 0) return result;

    const handles = new Set<string>();

    for (const raw of seeds) {
      const url = profileIdentityUrl(raw);
      const platform = detectPlatform(url);

      if (!platform) {
        log.warn(`seeds: площадка не распознана, ссылка пропущена — ${raw}`);
        continue;
      }
      if (!looksLikeProfileUrl(url)) {
        log.warn(`seeds: адрес не похож на профиль, пропущен — ${raw}`);
        continue;
      }

      const handle = extractHandle(url);
      if (handle && handle.length >= MIN_HANDLE_LENGTH) handles.add(handle);

      result.profiles.push({
        platform: platform.platform,
        url,
        ...(handle ? { handle } : {}),
        confidence: 0.9,
        signals: ['адрес передан при запуске, инструментом не проверялся'],
        evidence: [evidence(ID, url, startedAt, `${platform.label}: ${handle ?? url}`)],
      });

      if (handle) {
        result.facts.push({
          kind: 'alias',
          value: `${handle} (${platform.label})`,
          confidence: 0.9,
          signals: ['ник из переданного адреса профиля'],
          evidence: [evidence(ID, url, startedAt)],
        });
      }
    }

    // Один ник на разных площадках — самая частая связка. Один запрос на ник.
    for (const handle of handles) {
      const hits = await searchDuckDuckGo(http, buildQuery(handle), 10, log);

      for (const hit of hits) {
        const url = canonicalUrl(hit.url);
        if (!looksLikeProfileUrl(url)) continue;

        const platform = detectPlatform(url);
        if (!platform) continue;
        if (result.profiles.some((p) => profileIdentityUrl(p.url) === profileIdentityUrl(url))) continue;

        // Совпадение ника — зацепка, а не доказательство: ники повторяются у
        // разных людей. Поэтому оценка идёт по обычным правилам, а совпадение
        // ника лишь добавляет уверенности сверху.
        const { confidence, signals } = scoreHit(
          { url, title: hit.title, snippet: hit.snippet, sourcePrior: 0.5 },
          target,
          names,
        );
        const sameHandle = extractHandle(url)?.toLowerCase() === handle.toLowerCase();
        if (confidence === 0 && !sameHandle) continue;

        result.profiles.push({
          platform: platform.platform,
          url,
          ...(extractHandle(url) ? { handle: extractHandle(url) } : {}),
          title: hit.title,
          snippet: hit.snippet,
          confidence: clamp(sameHandle ? Math.max(confidence, 0.5) + 0.1 : confidence),
          signals: [
            ...signals,
            sameHandle ? `тот же ник, что и в заданном профиле: ${handle}` : `найден по нику ${handle}`,
          ],
          evidence: [evidence(ID, url, startedAt, hit.title, hit.snippet)],
        });
      }
    }

    return result;
  },
};
