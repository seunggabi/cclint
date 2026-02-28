import type { CommandAST, LintResult, FixSuggestion } from '../types.js';
import { compile } from '../compiler/index.js';
import { calculateScore } from '../scorer/index.js';
import { getMissingConstraints } from '../parser/ast-builder.js';

// 도메인별 기본값 (--fix 시 채워주는 값)
const DOMAIN_DEFAULTS: Record<string, Record<string, string>> = {
  commit: {
    language: 'ko',
    format: 'conventional-commits',
    'max-length': '72',
    types: 'feat, fix, refactor, docs, test, chore',
    body: 'required',
  },
  test: {
    framework: 'jest',
    coverage: '80%',
    target: 'src/**/*.ts',
    pattern: 'describe/it',
  },
  code: {
    language: 'typescript',
    style: 'eslint-standard',
  },
  api: {
    method: 'GET',
    'response-format': 'JSON',
  },
  deploy: {
    environment: 'production',
    strategy: 'rolling',
  },
  refactor: {
    scope: 'current-module',
    pattern: 'original-intent-preserved',
  },
  document: {
    format: 'markdown',
    language: 'ko',
  },
  translate: {
    'source-language': 'ko',
    'target-language': 'en',
  },
};

export function generateFix(ast: CommandAST, result: LintResult): FixSuggestion | null {
  const domain = ast.constraints['__domain__'];

  // 수정 후 예상 점수 계산 (fixable 메시지 제거 후)
  const remainingMessages = result.messages.filter(m => !m.fixable);
  const scoreAfterFix = Math.min(10, calculateScore(remainingMessages) + 1);

  // 컴파일된 기본 구조
  const compiled = compile(ast);

  // 도메인 기본값으로 누락된 제약 채우기
  if (domain && DOMAIN_DEFAULTS[domain]) {
    const missing = getMissingConstraints(ast);
    const domainObj = (compiled[domain] as Record<string, unknown>) ?? {};
    for (const key of missing) {
      const defaultVal = DOMAIN_DEFAULTS[domain][key];
      if (defaultVal) {
        domainObj[key] = defaultVal;
      }
    }
    compiled[domain] = domainObj;
  }

  if (Object.keys(compiled).length === 0) return null;

  return {
    description: `자동 수정 제안 (${result.errorCount}개 오류, ${result.warnCount}개 경고 해소)`,
    yaml: compiled,
    scoreAfterFix,
  };
}
