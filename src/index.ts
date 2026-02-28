import { buildAST } from './parser/ast-builder.js';
import { runRules } from './rules/index.js';
import { buildLintResult } from './scorer/index.js';
import { generateFix } from './fixer/index.js';
import type { CommandLintConfig, LintResult, FixSuggestion } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

export { DEFAULT_CONFIG } from './types.js';
export { loadConfig } from './config/index.js';
export type { LintResult, FixSuggestion, CommandLintConfig } from './types.js';

export interface LintOutput {
  result: LintResult;
  fix?: FixSuggestion | null;
}

export function lint(command: string, config: CommandLintConfig = DEFAULT_CONFIG): LintOutput {
  const ast = buildAST(command);
  const messages = runRules(ast, config);
  const result = buildLintResult(command, messages);
  return { result };
}

export function lintWithFix(command: string, config: CommandLintConfig = DEFAULT_CONFIG): LintOutput {
  const ast = buildAST(command);
  const messages = runRules(ast, config);
  const result = buildLintResult(command, messages);
  const fix = generateFix(ast, result);
  return { result, fix };
}
