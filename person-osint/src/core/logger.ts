import type { LoggerLike } from '../types.ts';
import type { RuntimeConfig } from '../config.ts';

const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 } as const;

export type LogLevel = keyof typeof LEVELS;

/** Пишет в stderr, чтобы stdout оставался чистым для JSON-вывода. */
export function createLogger(level: RuntimeConfig['logLevel']): LoggerLike {
  const threshold = LEVELS[level];
  const emit = (at: LogLevel, prefix: string, msg: string, rest: unknown[]) => {
    if (LEVELS[at] > threshold) return;
    process.stderr.write(`${prefix} ${msg}${rest.length ? ' ' + rest.map(fmt).join(' ') : ''}\n`);
  };
  return {
    debug: (msg, ...rest) => emit('debug', '  ·', msg, rest),
    info: (msg, ...rest) => emit('info', '  ›', msg, rest),
    warn: (msg, ...rest) => emit('warn', '  !', msg, rest),
    error: (msg, ...rest) => emit('error', '  ✗', msg, rest),
  };
}

function fmt(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
