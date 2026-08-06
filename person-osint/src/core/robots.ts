/**
 * Минимальный, но корректный по приоритетам разбор robots.txt:
 * группы User-agent, директивы Allow/Disallow, Crawl-delay.
 * Побеждает самое длинное совпавшее правило; при равной длине — Allow.
 */

interface Rule {
  allow: boolean;
  path: string;
  /** Длина «литеральной» части паттерна, используется для приоритета. */
  weight: number;
}

export interface RobotsPolicy {
  rules: Rule[];
  crawlDelayMs?: number;
  /** true, если robots.txt недоступен — трактуем как «разрешено всё». */
  missing: boolean;
}

export function parseRobots(text: string, userAgentToken: string): RobotsPolicy {
  const ua = userAgentToken.toLowerCase();
  const lines = text.split(/\r?\n/);

  // Собираем группы: список агентов -> директивы.
  const groups: Array<{ agents: string[]; rules: Rule[]; crawlDelay?: number }> = [];
  let current: { agents: string[]; rules: Rule[]; crawlDelay?: number } | undefined;
  let expectingAgents = false;

  for (const rawLine of lines) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!current || !expectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
        expectingAgents = true;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;
    expectingAgents = false;

    if (field === 'disallow' || field === 'allow') {
      // «Disallow:» с пустым значением означает «разрешено всё».
      if (field === 'disallow' && value === '') continue;
      current.rules.push({ allow: field === 'allow', path: value, weight: literalLength(value) });
    } else if (field === 'crawl-delay') {
      const seconds = Number.parseFloat(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelay = seconds;
    }
  }

  // Точное совпадение агента приоритетнее «*».
  const exact = groups.filter((g) => g.agents.some((a) => a !== '*' && ua.includes(a)));
  const wildcard = groups.filter((g) => g.agents.includes('*'));
  const chosen = exact.length ? exact : wildcard;

  const rules = chosen.flatMap((g) => g.rules);
  const delay = chosen.map((g) => g.crawlDelay).find((d) => d !== undefined);

  return {
    rules,
    ...(delay !== undefined ? { crawlDelayMs: delay * 1000 } : {}),
    missing: false,
  };
}

export function isAllowed(policy: RobotsPolicy, pathWithQuery: string): boolean {
  if (policy.missing || policy.rules.length === 0) return true;

  let best: Rule | undefined;
  for (const rule of policy.rules) {
    if (!matchesPattern(rule.path, pathWithQuery)) continue;
    if (!best || rule.weight > best.weight || (rule.weight === best.weight && rule.allow)) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}

/** Поддерживает подстановки `*` и якорь `$`, как это делают поисковые роботы. */
function matchesPattern(pattern: string, path: string): boolean {
  if (pattern === '') return false;
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const parts = body.split('*').map(escapeRegExp);
  const source = '^' + parts.join('.*') + (anchored ? '$' : '');
  try {
    return new RegExp(source).test(path);
  } catch {
    return false;
  }
}

function literalLength(pattern: string): number {
  return pattern.replace(/[*$]/g, '').length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const ALLOW_ALL: RobotsPolicy = { rules: [], missing: true };
