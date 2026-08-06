import type { Evidence, SourceYield } from '../types.ts';

export function evidence(
  sourceId: string,
  url: string,
  retrievedAt: string,
  title?: string,
  snippet?: string,
): Evidence {
  return {
    sourceId,
    url,
    retrievedAt,
    ...(title ? { title } : {}),
    ...(snippet ? { snippet } : {}),
  };
}

export const EMPTY: SourceYield = { profiles: [], documents: [], facts: [] };

export function emptyYield(): SourceYield {
  return { profiles: [], documents: [], facts: [] };
}

/** Ошибка отдельного запроса внутри источника не должна ронять весь источник. */
export async function tolerate<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}
