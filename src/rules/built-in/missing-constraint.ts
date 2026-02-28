import type { Rule, CommandAST, LintMessage } from '../../types.js';
import { getMissingConstraints } from '../../parser/ast-builder.js';

const CONSTRAINT_HINTS: Record<string, string> = {
  language: '출력 언어를 명시하세요 (예: "한국어로", "in English")',
  format: '포맷을 명시하세요 (예: "conventional-commits", "markdown")',
  'max-length': '최대 길이를 명시하세요 (예: "72자 이내")',
  framework: '테스트 프레임워크를 명시하세요 (예: "jest", "vitest")',
  coverage: '커버리지 기준을 명시하세요 (예: "80% 이상")',
  target: '대상 범위를 명시하세요 (예: "src/**/*.ts")',
  environment: '환경을 명시하세요 (예: "production", "staging")',
  strategy: '전략을 명시하세요 (예: "blue-green", "rolling")',
  scope: '범위를 명시하세요 (예: "auth 모듈")',
  pattern: '패턴을 명시하세요 (예: "factory method")',
  'source-language': '원본 언어를 명시하세요 (예: "한국어")',
  'target-language': '번역 대상 언어를 명시하세요 (예: "영어")',
  method: 'HTTP 메서드를 명시하세요 (예: "GET", "POST")',
  endpoint: '엔드포인트를 명시하세요 (예: "/api/users")',
  'response-format': '응답 형식을 명시하세요 (예: "JSON")',
};

export const missingConstraintRule: Rule = {
  id: 'missing-constraint',
  description: '도메인에 필요한 제약 조건 누락을 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const missing = getMissingConstraints(ast);
    return missing.map(c => ({
      ruleId: 'missing-constraint' as const,
      severity: 'warn' as const,
      message: `${c} 미지정`,
      detail: CONSTRAINT_HINTS[c] ?? `${c} 값을 명시하세요`,
      fixable: true,
    }));
  },
};
