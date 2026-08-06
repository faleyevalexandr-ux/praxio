import type { RuntimeConfig } from '../config.ts';
import { canonicalUrl, extractPageMeta } from '../core/html.ts';
import { clamp, detectPlatform, extractHandle, looksLikeProfileUrl, scoreHit } from '../core/score.ts';
import { truncate } from '../core/text.ts';
import type { Fact, HttpLike, LoggerLike, NameVariants, ProfileHit, SourceYield, Target } from '../types.ts';
import { evidence } from '../sources/_shared.ts';

const ID = 'enrich';

/**
 * Догружает найденные страницы и достаёт из них то, чего нет в поисковом
 * сниппете: разметку schema.org/Person, теги Open Graph и ссылки rel="me",
 * которые связывают профили одного человека между собой.
 *
 * Обрабатываются только самые уверенные находки: цель — уточнить их, а не
 * расширить обход вглубь сайта.
 */
export async function enrichFindings(
  collected: SourceYield,
  target: Target,
  names: NameVariants,
  http: HttpLike,
  log: LoggerLike,
  config: RuntimeConfig,
  startedAt: string,
): Promise<SourceYield> {
  const extra: SourceYield = { profiles: [], documents: [], facts: [] };

  const candidates = [...collected.profiles]
    .sort((a, b) => b.confidence - a.confidence)
    .filter((hit) => hit.confidence >= config.confidenceThreshold)
    .slice(0, config.enrichLimit);

  for (const candidate of candidates) {
    let meta;
    try {
      const response = await http.get(candidate.url);
      if (!response.ok) {
        log.debug(`enrich: ${candidate.url} → HTTP ${response.status}`);
        continue;
      }
      meta = extractPageMeta(response.body, response.url);
    } catch (error) {
      log.debug(`enrich: ${candidate.url} пропущен (${(error as Error).message})`);
      continue;
    }

    const body = [meta.person?.name, meta.person?.description, meta.text].filter(Boolean).join(' \n ');
    const { confidence, signals } = scoreHit(
      { url: candidate.url, title: meta.title, snippet: meta.description, body, sourcePrior: 0.6 },
      target,
      names,
    );

    // Страница, на которой имени не оказалось вовсе, — сигнал против находки,
    // но не приговор: сниппет мог прийти из закрытой для нас части сайта.
    if (confidence === 0) {
      log.debug(`enrich: на ${candidate.url} имя не подтвердилось`);
      continue;
    }

    const ev = [evidence(ID, candidate.url, startedAt, meta.title, truncate(meta.description ?? '', 300))];
    const person = meta.person;

    const push = (kind: Fact['kind'], value: string | undefined, signal: string, bonus = 0) => {
      if (!value?.trim()) return;
      extra.facts.push({
        kind,
        value: truncate(value, 240),
        confidence: clamp(confidence + bonus),
        signals: [...signals, signal],
        evidence: ev,
      });
    };

    if (person) {
      // JSON-LD размечает сайт сам о себе — это заявление первого лица,
      // поэтому такие поля получают надбавку к уверенности.
      push('alias', person.name, 'schema.org/Person: имя', 0.1);
      push('jobTitle', person.jobTitle, 'schema.org/Person: должность', 0.1);
      push('employer', person.worksFor, 'schema.org/Person: место работы', 0.1);
      push('location', person.address, 'schema.org/Person: адрес', 0.1);
      push('education', person.alumniOf, 'schema.org/Person: образование', 0.1);
      push('bio', person.description, 'schema.org/Person: описание');
      push('website', person.url, 'schema.org/Person: сайт');
      push('image', person.image, 'schema.org/Person: фото');
    } else if (meta.description) {
      push('bio', meta.description, 'описание страницы');
    }

    if (meta.image) push('image', meta.image, 'изображение Open Graph');

    // rel="me" и sameAs — это явное заявление «оба аккаунта мои».
    for (const link of unique([...meta.sameAs])) {
      const url = canonicalUrl(link);
      if (!looksLikeProfileUrl(url)) continue;
      const platform = detectPlatform(url);
      if (!platform) continue;

      const linked: ProfileHit = {
        platform: platform.platform,
        url,
        ...(extractHandle(url) ? { handle: extractHandle(url) } : {}),
        confidence: clamp(candidate.confidence * 0.9 + 0.1),
        signals: [`заявлен как свой на ${candidate.url}`],
        evidence: [evidence(ID, candidate.url, startedAt, meta.title)],
      };
      extra.profiles.push(linked);
    }

    log.debug(`enrich: ${candidate.url} → фактов ${extra.facts.length}, связей ${meta.sameAs.length}`);
  }

  return extra;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
