import type { Rule, CommandAST, LintMessage } from '../../types.js';
import { SUBJECTIVE_CRITERIA } from '../../parser/tokenizer.js';

export const noSubjectiveCriterionRule: Rule = {
  id: 'no-subjective-criterion',
  description: '측정 불가능한 주관적 기준을 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const messages: LintMessage[] = [];

    for (const q of ast.qualifiers) {
      if (SUBJECTIVE_CRITERIA.has(q)) {
        messages.push({
          ruleId: 'no-subjective-criterion',
          severity: 'warn',
          message: `"${q}" — 주관적 기준`,
          detail: `측정 가능한 객관적 기준으로 대체하세요 (예: "Lighthouse 점수 90 이상", "W3C 접근성 AA 등급")`,
          fixable: true,
        });
      }
    }

    return messages;
  },
};
