import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';
import type { CcLintConfig, RuleId, RuleConfig, CustomConfig } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

// ─── .cclintrc 로더 ────────────────────────────────────────────────────
// 우선순위: ./cclintrc > ./.cclintrc > ~/.cclintrc

interface RawConfig {
  rules?: Record<string, string>;
  custom?: {
    language?: string;
    domains?: Record<string, { required: string[] }>;
  };
}

const CONFIG_SEARCH_PATHS = [
  (cwd: string) => join(cwd, 'cclintrc'),
  (cwd: string) => join(cwd, '.cclintrc'),
  () => join(homedir(), '.cclintrc'),
];

export function findConfigPath(cwd: string = process.cwd()): string | null {
  for (const pathFn of CONFIG_SEARCH_PATHS) {
    const p = pathFn(cwd);
    if (existsSync(p)) return p;
  }
  return null;
}

export function loadConfig(cwd: string = process.cwd()): CcLintConfig {
  const configPath = findConfigPath(cwd);
  if (!configPath) return DEFAULT_CONFIG;

  try {
    const content = readFileSync(configPath, 'utf-8');
    const raw = yaml.load(content) as RawConfig | null;
    if (!raw) return DEFAULT_CONFIG;

    return mergeConfig(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
}

function mergeConfig(raw: RawConfig): CcLintConfig {
  const rules: Partial<Record<RuleId, RuleConfig>> = { ...DEFAULT_CONFIG.rules };

  if (raw.rules) {
    for (const [key, value] of Object.entries(raw.rules)) {
      if (isValidRuleConfig(value)) {
        rules[key as RuleId] = value;
      }
    }
  }

  const config: CcLintConfig = { rules };

  if (raw.custom) {
    config.custom = {
      language: raw.custom.language,
      domains: raw.custom.domains,
    };
  }

  return config;
}

function isValidRuleConfig(value: string): value is RuleConfig {
  return value === 'error' || value === 'warn' || value === 'off';
}
