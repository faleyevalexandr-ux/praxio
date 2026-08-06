export { investigate, type InvestigateOptions } from './pipeline/run.ts';
export { renderMarkdown } from './report/markdown.ts';
export { ALL_SOURCES, selectSources } from './sources/index.ts';
export { buildNameVariants, parseName } from './core/text.ts';
export { DEFAULT_CONFIG, TOOL_NAME, TOOL_VERSION, type RuntimeConfig } from './config.ts';
export type {
  DocumentHit,
  Evidence,
  Fact,
  FactKind,
  ProfileHit,
  Report,
  Source,
  SourceYield,
  Target,
} from './types.ts';
