import type { Rule, CommandAST, LintMessage } from '../../types.js';

// ─── 모호한 정량 표현 사전 ───────────────────────────────────────────────────
// 정량적 기준 없이 사용된 수량/정도 표현을 검출
// 한국어는 어근(stem)과 활용형 모두 등록 (조사 제거 후 매칭용)
const VAGUE_QUANTIFIERS = new Set([
  // 한국어 — 활용형
  '많은', '적은', '빠른', '느린', '큰', '작은', '높은', '낮은',
  '충분한', '약간', '조금', '꽤',
  // 한국어 — 어근 (조사 제거 후 매칭)
  '많', '적', '빠르', '느리', '크', '작', '높', '낮', '충분',
  // 한국어 — 부사형
  '빠르게', '느리게',
  // 영어
  'many', 'few', 'fast', 'slow', 'large', 'small', 'high', 'low',
  'sufficient', 'some',
]);

export const vagueQuantifierRule: Rule = {
  id: 'vague-quantifier',
  description: '정량 기준 없는 모호한 수량/정도 표현을 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const messages: LintMessage[] = [];
    const seen = new Set<string>();

    for (const node of ast.nodes) {
      const normalized = node.value.toLowerCase();
      const raw = node.raw.replace(/[.,!?~]+$/, '').toLowerCase();

      // 정규화된 값 또는 원본 어절 중 하나라도 매칭
      const matched = VAGUE_QUANTIFIERS.has(normalized) ? normalized
        : VAGUE_QUANTIFIERS.has(raw) ? raw
        : null;

      if (matched && !seen.has(matched)) {
        seen.add(matched);
        const display = raw || normalized;
        messages.push({
          ruleId: 'vague-quantifier',
          severity: 'warn',
          message: `"${display}" — 정량 기준 없음`,
          detail: `"${display}"은 구체적인 수치로 대체하세요 (예: "100개 이상", "500ms 이내", "10MB 미만")`,
          fixable: true,
        });
      }
    }

    return messages;
  },
};
