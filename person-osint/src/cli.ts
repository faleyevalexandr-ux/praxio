#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DEFAULT_CONFIG, TOOL_NAME, TOOL_VERSION, type RuntimeConfig } from './config.ts';
import { describeQuery, groupByHost } from './core/dry-run.ts';
import { ALL_SOURCES, unknownSourceIds } from './sources/index.ts';
import { investigate } from './pipeline/run.ts';
import { renderMarkdown } from './report/markdown.ts';
import type { Target } from './types.ts';

const USAGE = `
${TOOL_NAME} v${TOOL_VERSION} — сбор публичных сведений о человеке из открытых источников.

ИСПОЛЬЗОВАНИЕ
  ${TOOL_NAME} "Иван Петров" [опции]
  ${TOOL_NAME} sources

ОПЦИИ ПОИСКА
  --city <город>          Город или регион (сильно повышает точность)
  --company <название>    Компания, ВУЗ или организация
  --country <ISO2>        Код страны, влияет на выбор языка источников (RU, US…)
  --keyword <слово>       Дополнительный уточнитель, можно повторять
  --profile <url>         Уже известный адрес профиля, можно повторять. От него
                          раскручиваются связанные аккаунты и одинаковые ники
  --purpose <текст>       Цель сбора, попадает в отчёт как отметка об основании

ОПЦИИ ВЫВОДА
  --format <md|json|both> Формат отчёта (по умолчанию both)
  --out <путь>            Каталог для файлов отчёта (по умолчанию ./reports)
  --stdout                Печатать отчёт в stdout вместо записи в файл
  --threshold <0..1>      Порог уверенности для основного раздела (${DEFAULT_CONFIG.confidenceThreshold})

ОПЦИИ ПРОГОНА
  --only <id,id>          Использовать только указанные источники
  --skip <id,id>          Исключить источники
  --concurrency <n>       Параллельных источников (${DEFAULT_CONFIG.concurrency})
  --delay <мс>            Пауза между запросами к одному хосту (${DEFAULT_CONFIG.perHostDelayMs})
  --timeout <мс>          Таймаут запроса (${DEFAULT_CONFIG.timeoutMs})
  --max-results <n>       Предел находок с одного источника (${DEFAULT_CONFIG.maxResultsPerSource})
  --no-enrich             Не догружать найденные страницы
  --dry-run               Показать, какие запросы ушли бы в сеть, и ничего не отправлять
  --cache                 Кэшировать ответы на диск (в кэше будут персональные данные)
  --ignore-robots         Не учитывать robots.txt при обходе веб-страниц
  --verbose               Подробный лог в stderr
  --quiet                 Только ошибки
  -h, --help              Эта справка

ПРИМЕРЫ
  ${TOOL_NAME} "Иван Петров" --city Москва --company "Яндекс"
  ${TOOL_NAME} "Ada Lovelace" --country US --format md --stdout
  ${TOOL_NAME} "Иван Петров" --only websearch,social --threshold 0.6

ПРАВОВАЯ ЧАСТЬ
  Инструмент собирает только общедоступные сведения и не обходит авторизацию.
  Обработка персональных данных требует законного основания (GDPR, 152-ФЗ).
  Не используйте результаты для слежки, преследования или скрытого профилирования.
`;

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      city: { type: 'string' },
      company: { type: 'string' },
      country: { type: 'string' },
      keyword: { type: 'string', multiple: true },
      profile: { type: 'string', multiple: true },
      purpose: { type: 'string' },
      format: { type: 'string', default: 'both' },
      out: { type: 'string', default: 'reports' },
      stdout: { type: 'boolean', default: false },
      threshold: { type: 'string' },
      only: { type: 'string' },
      skip: { type: 'string' },
      concurrency: { type: 'string' },
      delay: { type: 'string' },
      timeout: { type: 'string' },
      'max-results': { type: 'string' },
      'no-enrich': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      cache: { type: 'boolean', default: false },
      'ignore-robots': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      quiet: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  if (positionals[0] === 'sources') {
    printSources();
    return 0;
  }

  const fullName = positionals.join(' ').trim();
  if (!fullName) {
    process.stderr.write('Не указано имя.\n');
    process.stdout.write(`${USAGE}\n`);
    return 2;
  }

  const only = splitList(values.only);
  const skip = splitList(values.skip);
  const unknown = unknownSourceIds([...only, ...skip]);
  if (unknown.length) {
    process.stderr.write(
      `Неизвестные источники: ${unknown.join(', ')}. Доступные см. в \`${TOOL_NAME} sources\`.\n`,
    );
    return 2;
  }

  const format = values.format ?? 'both';
  if (!['md', 'json', 'both'].includes(format)) {
    process.stderr.write(`Неизвестный формат: ${format}. Допустимо: md, json, both.\n`);
    return 2;
  }

  const config: Partial<RuntimeConfig> = {
    logLevel: values.quiet ? 'error' : values.verbose ? 'debug' : 'info',
    cache: values.cache,
    dryRun: values['dry-run'],
    respectRobots: !values['ignore-robots'],
    ...numeric('concurrency', values.concurrency),
    ...numeric('perHostDelayMs', values.delay),
    ...numeric('timeoutMs', values.timeout),
    ...numeric('maxResultsPerSource', values['max-results']),
    ...numeric('confidenceThreshold', values.threshold),
  };
  if (values['no-enrich']) config.enrichLimit = 0;

  const threshold = config.confidenceThreshold ?? DEFAULT_CONFIG.confidenceThreshold;

  const target: Target = {
    fullName,
    ...(values.city ? { city: values.city } : {}),
    ...(values.company ? { company: values.company } : {}),
    ...(values.country ? { country: values.country } : {}),
    ...(values.purpose ? { purpose: values.purpose } : {}),
    keywords: values.keyword ?? [],
    ...(values.profile?.length ? { knownProfiles: values.profile } : {}),
  };

  const report = await investigate(target, {
    config,
    ...(only.length ? { only } : {}),
    ...(skip.length ? { skip } : {}),
  });

  if (report.plannedRequests) {
    printPlan(report.plannedRequests);
    return 0;
  }

  const markdown = renderMarkdown(report, threshold);
  const json = JSON.stringify(report, null, 2);

  if (values.stdout) {
    process.stdout.write(format === 'json' ? `${json}\n` : `${markdown}\n`);
    return 0;
  }

  const dir = resolve(process.cwd(), values.out ?? 'reports');
  await mkdir(dir, { recursive: true });
  const base = slug(fullName) || 'report';
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const written: string[] = [];

  if (format === 'md' || format === 'both') {
    const path = join(dir, `${base}-${stamp}.md`);
    await writeFile(path, markdown, 'utf8');
    written.push(path);
  }
  if (format === 'json' || format === 'both') {
    const path = join(dir, `${base}-${stamp}.json`);
    await writeFile(path, json, 'utf8');
    written.push(path);
  }

  process.stdout.write(
    `\nГотово: профилей ${report.stats.totalProfiles}, документов ${report.stats.totalDocuments}, фактов ${report.stats.totalFacts}.\n`,
  );
  for (const path of written) process.stdout.write(`  ${path}\n`);
  if (report.ambiguity.notes.length) {
    process.stdout.write('\nПредупреждения:\n');
    for (const note of report.ambiguity.notes) process.stdout.write(`  • ${note}\n`);
  }

  return 0;
}

function printPlan(requests: string[]): void {
  const groups = groupByHost(requests);
  process.stdout.write(`\nСухой прогон: ${requests.length} запросов к ${groups.length} хостам, ничего не отправлено.\n`);

  for (const { host, urls } of groups) {
    process.stdout.write(`\n${host} (${urls.length})\n`);
    for (const url of urls) {
      const query = describeQuery(url);
      process.stdout.write(query ? `  ${query}\n` : `  ${url}\n`);
    }
  }

  process.stdout.write(
    '\nМногошаговые источники показывают только первый шаг: следующий запрос\n' +
      'строится по данным, которых в сухом прогоне нет.\n',
  );
}

function printSources(): void {
  process.stdout.write(`Доступные источники (${ALL_SOURCES.length}), все без API-ключей:\n\n`);
  const width = Math.max(...ALL_SOURCES.map((s) => s.id.length));
  for (const source of ALL_SOURCES) {
    process.stdout.write(`  ${source.id.padEnd(width)}  ${source.name}\n`);
    process.stdout.write(`  ${' '.repeat(width)}  ${source.description}\n\n`);
  }
}

function splitList(value: string | undefined): string[] {
  return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}

function numeric<K extends keyof RuntimeConfig>(
  key: K,
  raw: string | undefined,
): Partial<RuntimeConfig> {
  if (raw === undefined) return {};
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Опция ${String(key)} ожидает число, получено «${raw}».`);
  }
  return { [key]: value } as Partial<RuntimeConfig>;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`\nОшибка: ${(error as Error).message}\n`);
    process.exitCode = 1;
  });
