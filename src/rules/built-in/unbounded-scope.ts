import type { Rule, CommandAST, LintMessage } from '../../types.js';
import { SCOPE_UNBOUNDED_KEYWORDS } from '../../parser/tokenizer.js';

export const unboundedScopeRule: Rule = {
  id: 'unbounded-scope',
  description: '범위 제한 없는 지시를 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const messages: LintMessage[] = [];

    // scope 토큰이 unbounded 키워드로 시작하는 경우
    if (ast.scope) {
      const scopeNorm = ast.scope.toLowerCase();
      for (const kw of SCOPE_UNBOUNDED_KEYWORDS) {
        if (scopeNorm.startsWith(kw)) {
          messages.push({
            ruleId: 'unbounded-scope',
            severity: 'warn',
            message: `"${kw}" — 범위 무제한`,
            detail: '구체적인 경로, 모듈, 또는 조건으로 제한하세요 (예: "src/auth/**", "로그인 관련 파일만")',
            fixable: true,
          });
          return messages; // 하나만 보고
        }
      }
    }

    // AST 노드에서 독립 어절로 unbounded 키워드가 등장하는 경우
    const nodeValues = new Set(ast.nodes.map(n => n.value.toLowerCase()));
    for (const kw of SCOPE_UNBOUNDED_KEYWORDS) {
      if (nodeValues.has(kw)) {
        messages.push({
          ruleId: 'unbounded-scope',
          severity: 'warn',
          message: `"${kw}" — 범위가 과도하게 넓음`,
          detail: '구체적인 범위를 지정하세요',
          fixable: true,
        });
        break;
      }
    }

    return messages;
  },
};
