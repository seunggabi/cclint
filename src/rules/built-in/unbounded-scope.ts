import type { Rule, CommandAST, LintMessage } from '../../types.js';
import { SCOPE_UNBOUNDED_KEYWORDS } from '../../parser/tokenizer.js';

/**
 * 커맨드에 구체적인 경로/파일/모듈이 명시되어 있으면 true
 * 예: "src/auth/** 모든 파일" → "src/auth/**" 이 있으므로 실제로는 범위 한정됨
 */
function hasSpecificScope(raw: string): boolean {
  // 파일 경로 패턴: src/, lib/, *.ts, /path/to/ 등
  if (/(?:src|lib|dist|test|spec|app|components|pages|api|utils|hooks|store|services)\//.test(raw)) return true;
  // glob 패턴: *.ts, **/*.js 등
  if (/[*?]\.\w{1,4}/.test(raw)) return true;
  // 파일 확장자 직접 명시: foo.ts, bar.py 등
  if (/\w+\.(?:ts|js|tsx|jsx|py|go|rs|java|vue|svelte|css|scss)\b/.test(raw)) return true;
  // 슬래시 포함 경로: /auth, /users 등
  if (/\/\w{2,}/.test(raw)) return true;
  return false;
}

export const unboundedScopeRule: Rule = {
  id: 'unbounded-scope',
  description: '범위 제한 없는 지시를 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const messages: LintMessage[] = [];

    // 문맥 확인: 구체적인 경로/파일이 이미 명시되어 있으면 "모든/전체"는 그 범위를 수식하는 것
    // 예: "src/auth/** 모든 파일 리뷰해줘" → 실제 범위는 src/auth/**로 한정
    if (hasSpecificScope(ast.raw)) return messages;

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
            fixable: false,
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
          fixable: false,
        });
        break;
      }
    }

    return messages;
  },
};
