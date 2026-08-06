import { DEFAULT_CONFIG, TOOL_NAME, TOOL_VERSION, type RuntimeConfig } from '../config.ts';
import { HttpClient } from '../core/http.ts';
import { createConcurrencyLimiter } from '../core/limiter.ts';
import { createLogger } from '../core/logger.ts';
import { mergeDocuments, mergeFacts, mergeProfiles } from '../core/merge.ts';
import { estimateDistinctPeople } from '../core/score.ts';
import { buildNameVariants } from '../core/text.ts';
import { selectSources } from '../sources/index.ts';
import type { HttpLike, Report, Source, SourceRunReport, SourceYield, Target } from '../types.ts';
import { enrichFindings } from './enrich.ts';

export interface InvestigateOptions {
  config?: Partial<RuntimeConfig>;
  only?: string[];
  skip?: string[];
  /** Подмена HTTP-клиента: используется в тестах, чтобы прогон не ходил в сеть. */
  http?: HttpLike;
}

/**
 * Полный прогон: параллельный опрос источников → догрузка страниц →
 * слияние дублей → отчёт. Отказ одного источника не останавливает остальные.
 */
export async function investigate(target: Target, options: InvestigateOptions = {}): Promise<Report> {
  const config: RuntimeConfig = { ...DEFAULT_CONFIG, ...options.config };
  const log = createLogger(config.logLevel);
  const http: HttpLike = options.http ?? new HttpClient(config, log);
  const names = buildNameVariants(target.fullName);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  const sources = selectSources({ ...(options.only ? { only: options.only } : {}), ...(options.skip ? { skip: options.skip } : {}) });
  if (sources.length === 0) {
    throw new Error('Не выбрано ни одного источника: проверьте значения --only и --skip.');
  }

  log.info(`Цель: ${target.fullName}${target.city ? `, ${target.city}` : ''}${target.company ? `, ${target.company}` : ''}`);
  log.info(`Источников: ${sources.length}, форм имени: ${names.queryForms.length}`);

  const limit = createConcurrencyLimiter(config.concurrency);
  const runReports: SourceRunReport[] = [];
  const collected: SourceYield = { profiles: [], documents: [], facts: [] };

  const runs = sources.map((source) =>
    limit(async () => {
      const began = Date.now();
      try {
        const output = await source.run({
          target,
          names,
          http,
          log,
          maxResults: config.maxResultsPerSource,
          startedAt,
        });
        const hits = output.profiles.length + output.documents.length + output.facts.length;
        collected.profiles.push(...output.profiles);
        collected.documents.push(...output.documents);
        collected.facts.push(...output.facts);
        runReports.push(describe(source, true, Date.now() - began, hits));
        log.info(`${source.name}: ${hits} находок за ${Date.now() - began} мс`);
      } catch (error) {
        const message = (error as Error).message;
        runReports.push({ ...describe(source, false, Date.now() - began, 0), error: message });
        log.warn(`${source.name}: ошибка — ${message}`);
      }
    }),
  );

  await Promise.all(runs);

  if (config.enrichLimit > 0) {
    log.info('Догружаю найденные страницы для уточнения данных…');
    const extra = await enrichFindings(collected, target, names, http, log, config, startedAt);
    collected.profiles.push(...extra.profiles);
    collected.documents.push(...extra.documents);
    collected.facts.push(...extra.facts);
  }

  const profiles = mergeProfiles(collected.profiles).filter((p) => p.confidence > 0);
  const documents = mergeDocuments(collected.documents).filter((d) => d.confidence > 0);
  const facts = mergeFacts(collected.facts).filter((f) => f.confidence > 0);

  const texts = [
    ...profiles.map((p) => [p.title, p.snippet].filter(Boolean).join(' ')),
    ...documents.map((d) => [d.title, d.snippet].filter(Boolean).join(' ')),
  ];
  const distinct = estimateDistinctPeople(texts, names);

  const highConfidence = [...profiles, ...documents, ...facts].filter(
    (item) => item.confidence >= 0.75,
  ).length;

  const notes: string[] = [];
  if (!target.city && !target.company) {
    notes.push('Не заданы город и организация — отделить однофамильцев практически невозможно. Добавьте --city или --company.');
  }
  if (distinct > 2) {
    notes.push(`В выдаче прослеживается около ${distinct} разных контекстов вокруг этого имени: вероятно, это разные люди.`);
  }
  if (highConfidence === 0 && profiles.length + documents.length > 0) {
    notes.push('Ни одна находка не набрала высокой уверенности: считайте результат черновиком для ручной проверки.');
  }

  return {
    tool: { name: TOOL_NAME, version: TOOL_VERSION },
    target,
    generatedAt: startedAt,
    durationMs: Date.now() - startedMs,
    sources: runReports.sort((a, b) => a.id.localeCompare(b.id)),
    profiles,
    documents,
    facts,
    ambiguity: {
      commonNameWarning: distinct > 2 || (!target.city && !target.company),
      distinctCandidatesEstimate: distinct,
      notes,
    },
    stats: {
      totalProfiles: profiles.length,
      totalDocuments: documents.length,
      totalFacts: facts.length,
      highConfidence,
      sourcesOk: runReports.filter((r) => r.ok).length,
      sourcesFailed: runReports.filter((r) => !r.ok).length,
    },
  };
}

function describe(source: Source, ok: boolean, durationMs: number, hits: number): SourceRunReport {
  return { id: source.id, name: source.name, category: source.category, ok, durationMs, hits };
}
