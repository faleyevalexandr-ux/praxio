import type { DocumentHit, Fact, FactKind, ProfileHit, Report } from '../types.ts';

const FACT_LABELS: Record<FactKind, string> = {
  alias: 'Другие написания имени',
  jobTitle: 'Должность',
  employer: 'Место работы',
  location: 'География',
  education: 'Образование',
  website: 'Сайты',
  image: 'Изображения',
  bio: 'Описание',
  identifier: 'Идентификаторы',
  birthDate: 'Дата рождения',
};

const FACT_ORDER: FactKind[] = [
  'jobTitle', 'employer', 'location', 'education', 'bio',
  'alias', 'identifier', 'website', 'birthDate', 'image',
];

const DOCUMENT_LABELS: Record<DocumentHit['kind'], string> = {
  paper: 'Публикации',
  news: 'Публикации в прессе',
  post: 'Посты и обсуждения',
  page: 'Прочие страницы',
};

/** Отчёт для человека: сначала выводы, потом сырые находки, в конце — диагностика. */
export function renderMarkdown(report: Report, threshold: number): string {
  const lines: string[] = [];
  const { target } = report;

  lines.push(`# Отчёт по открытым источникам: ${target.fullName}`);
  lines.push('');
  lines.push(`**Собрано:** ${formatDate(report.generatedAt)} · ${(report.durationMs / 1000).toFixed(1)} с`);
  const criteria = [
    target.city && `город: ${target.city}`,
    target.company && `организация: ${target.company}`,
    target.country && `страна: ${target.country}`,
    target.keywords.length > 0 && `уточнители: ${target.keywords.join(', ')}`,
  ].filter(Boolean);
  if (criteria.length) lines.push(`**Критерии поиска:** ${criteria.join(' · ')}`);
  if (target.purpose) lines.push(`**Цель сбора:** ${target.purpose}`);
  lines.push('');

  lines.push('> Все сведения получены из общедоступных источников без обхода авторизации.');
  lines.push('> Уверенность — оценка алгоритма, а не подтверждённый факт: каждую строку');
  lines.push('> нужно проверять по ссылке на первоисточник.');
  lines.push('');

  if (report.ambiguity.notes.length) {
    lines.push('## ⚠️ На что обратить внимание');
    lines.push('');
    for (const note of report.ambiguity.notes) lines.push(`- ${note}`);
    lines.push('');
  }

  lines.push('## Сводка');
  lines.push('');
  lines.push(`- Профилей: **${report.stats.totalProfiles}**`);
  lines.push(`- Документов и упоминаний: **${report.stats.totalDocuments}**`);
  lines.push(`- Фактов: **${report.stats.totalFacts}**`);
  lines.push(`- Находок с высокой уверенностью (≥ 0.75): **${report.stats.highConfidence}**`);
  lines.push(`- Источников отработало: **${report.stats.sourcesOk}** из ${report.sources.length}`);
  lines.push('');

  const confirmedFacts = report.facts.filter((f) => f.confidence >= threshold);
  if (confirmedFacts.length) {
    lines.push('## Что известно о человеке');
    lines.push('');
    for (const kind of FACT_ORDER) {
      const group = confirmedFacts.filter((f) => f.kind === kind);
      if (!group.length) continue;
      lines.push(`### ${FACT_LABELS[kind]}`);
      lines.push('');
      for (const fact of group.slice(0, 12)) lines.push(renderFact(fact));
      lines.push('');
    }
  }

  const profiles = report.profiles.filter((p) => p.confidence >= threshold);
  if (profiles.length) {
    lines.push('## Профили и аккаунты');
    lines.push('');
    lines.push('| Уверенность | Площадка | Ссылка | Почему |');
    lines.push('| --- | --- | --- | --- |');
    for (const profile of profiles) lines.push(renderProfileRow(profile));
    lines.push('');
  }

  const documents = report.documents.filter((d) => d.confidence >= threshold);
  for (const kind of ['paper', 'news', 'post', 'page'] as const) {
    const group = documents.filter((d) => d.kind === kind);
    if (!group.length) continue;
    lines.push(`## ${DOCUMENT_LABELS[kind]}`);
    lines.push('');
    for (const document of group.slice(0, 30)) lines.push(renderDocument(document));
    lines.push('');
  }

  const weak = [
    ...report.profiles.filter((p) => p.confidence < threshold),
    ...report.documents.filter((d) => d.confidence < threshold),
  ];
  if (weak.length) {
    lines.push('## Требует проверки');
    lines.push('');
    lines.push(`Совпадение по имени есть, но подтверждения по городу, организации или другим`);
    lines.push(`признакам нет. Скорее всего, часть этих находок относится к однофамильцам.`);
    lines.push('');
    for (const item of weak.slice(0, 40)) {
      const title = 'title' in item && item.title ? item.title : item.url;
      lines.push(`- ${badge(item.confidence)} [${escapePipes(String(title))}](${item.url})`);
    }
    lines.push('');
  }

  lines.push('## Источники');
  lines.push('');
  lines.push('| Источник | Статус | Находок | Время |');
  lines.push('| --- | --- | --- | --- |');
  for (const source of report.sources) {
    const status = source.ok ? 'ок' : `ошибка: ${escapePipes(source.error ?? 'неизвестно')}`;
    lines.push(`| ${escapePipes(source.name)} | ${status} | ${source.hits} | ${source.durationMs} мс |`);
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(
    `Собрано инструментом \`${report.tool.name}\` v${report.tool.version}. Отчёт содержит персональные данные: ` +
      'храните его ограниченно по времени и не передавайте третьим лицам без правового основания.',
  );
  lines.push('');

  return lines.join('\n');
}

function renderFact(fact: Fact): string {
  const sources = fact.evidence
    .slice(0, 3)
    .map((e, i) => `[${i + 1}](${e.url})`)
    .join(' ');
  return `- ${badge(fact.confidence)} ${escapePipes(fact.value)} — ${sources} _(${fact.signals.slice(0, 2).join('; ')})_`;
}

function renderProfileRow(profile: ProfileHit): string {
  const label = profile.displayName ?? profile.handle ?? profile.title ?? profile.url;
  return `| ${badge(profile.confidence)} | ${profile.platform} | [${escapePipes(truncateLabel(label))}](${profile.url}) | ${escapePipes(profile.signals.slice(0, 2).join('; '))} |`;
}

function renderDocument(document: DocumentHit): string {
  const meta = [document.published ? formatDate(document.published) : undefined, document.venue]
    .filter(Boolean)
    .join(' · ');
  const head = `- ${badge(document.confidence)} [${escapePipes(document.title)}](${document.url})`;
  return meta ? `${head} — _${escapePipes(meta)}_` : head;
}

/** Числовая оценка плюс визуальная метка: в длинном списке цифры сливаются. */
function badge(confidence: number): string {
  const value = confidence.toFixed(2);
  if (confidence >= 0.75) return `🟢 ${value}`;
  if (confidence >= 0.5) return `🟡 ${value}`;
  return `⚪ ${value}`;
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 10);
}

function escapePipes(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function truncateLabel(value: string): string {
  return value.length > 60 ? `${value.slice(0, 57)}…` : value;
}
