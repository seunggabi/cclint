import type { Rule, CommandAST, LintMessage } from '../../types.js';

// ─── 위험 키워드 / 안전장치 키워드 ──────────────────────────────────────────
const DANGER_KEYWORDS = new Set([
  '삭제', 'drop', 'delete', 'rm',
  '배포', 'deploy',
  '운영', 'production',
  'reset', 'truncate',
]);

const SAFETY_KEYWORDS = new Set([
  '백업', 'backup', 'rollback',
  '확인', 'confirm', 'dry-run',
  '브랜치', 'branch',
]);

export const noRollbackPlanRule: Rule = {
  id: 'no-rollback-plan',
  description: '위험 작업에 롤백/안전장치가 없음을 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const words = ast.nodes.map(n => n.value.toLowerCase());

    const hasDanger = words.some(w => DANGER_KEYWORDS.has(w));
    if (!hasDanger) return [];

    const hasSafety = words.some(w => SAFETY_KEYWORDS.has(w));
    if (hasSafety) return [];

    const dangerFound = words.find(w => DANGER_KEYWORDS.has(w))!;

    return [{
      ruleId: 'no-rollback-plan',
      severity: 'warn',
      message: `"${dangerFound}" — 롤백/안전장치 없음`,
      detail: '위험 작업에는 백업, 롤백, dry-run, 확인 절차 등 안전장치를 명시하세요',
      fixable: true,
    }];
  },
};
