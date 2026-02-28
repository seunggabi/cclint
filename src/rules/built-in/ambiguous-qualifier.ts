import type { Rule, CommandAST, LintMessage } from '../../types.js';
import { AMBIGUOUS_QUALIFIERS } from '../../parser/tokenizer.js';

export const ambiguousQualifierRule: Rule = {
  id: 'ambiguous-qualifier',
  description: '정량 기준 없는 모호한 수식어를 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const messages: LintMessage[] = [];

    for (const q of ast.qualifiers) {
      if (AMBIGUOUS_QUALIFIERS.has(q)) {
        messages.push({
          ruleId: 'ambiguous-qualifier',
          severity: 'error',
          message: `"${q}" — 정량 기준 없음`,
          detail: `"${q}"는 해석이 실행마다 달라질 수 있습니다. 구체적인 기준을 명시하세요.`,
          fixable: true,
        });
      }
    }

    return messages;
  },
};
