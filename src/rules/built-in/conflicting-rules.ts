import type { Rule, CommandAST, LintMessage } from '../../types.js';

// 서로 충돌하는 수식어 쌍
const CONFLICTING_PAIRS: Array<[string[], string[], string]> = [
  [
    ['간결하게', '간단히', '짧게', 'briefly', 'concise'],
    ['상세하게', '자세하게', '길게', 'detailed', 'verbose'],
    '"간결하게"와 "상세하게"는 동시에 성립하지 않습니다',
  ],
  [
    ['빠르게', '빨리', '빠른', 'quickly', 'fast'],
    ['꼼꼼하게', '철저하게', '완벽하게', 'thoroughly', 'carefully'],
    '"빠르게"와 "철저하게"는 상충될 수 있습니다',
  ],
  [
    ['최소화', '줄여', 'minimize'],
    ['최대화', '늘려', 'maximize'],
    '"최소화"와 "최대화"는 동시에 적용 불가합니다',
  ],
];

export const conflictingRulesRule: Rule = {
  id: 'conflicting-rules',
  description: '서로 충돌하는 제약 조건을 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const messages: LintMessage[] = [];
    const nodeValues = ast.nodes.map(n => n.value.toLowerCase());

    for (const [groupA, groupB, reason] of CONFLICTING_PAIRS) {
      const hasA = groupA.some(w => nodeValues.some(v => v.includes(w)));
      const hasB = groupB.some(w => nodeValues.some(v => v.includes(w)));

      if (hasA && hasB) {
        const foundA = groupA.find(w => nodeValues.some(v => v.includes(w)))!;
        const foundB = groupB.find(w => nodeValues.some(v => v.includes(w)))!;
        messages.push({
          ruleId: 'conflicting-rules',
          severity: 'error',
          message: `"${foundA}" vs "${foundB}" — 규칙 충돌`,
          detail: reason,
          fixable: false,
        });
      }
    }

    return messages;
  },
};
