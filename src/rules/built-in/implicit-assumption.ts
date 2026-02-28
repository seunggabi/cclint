import type { Rule, CommandAST, LintMessage } from '../../types.js';

// ─── 암묵적 전제 메시지 매핑 ─────────────────────────────────────────────────
// ast-builder.ts가 constraints에 "__implicit__*" 플래그를 기록함
// 이 규칙은 ast.raw 대신 ast.constraints의 키만 읽어서 메시지 생성 (pure function)
const IMPLICIT_MESSAGES: Record<string, { message: string; detail: string }> = {
  '__implicit__existing-state': {
    message: '"기존" — 어떤 기존 상태인지 명시 필요',
    detail: '현재 코드베이스 상태, 특정 파일, 또는 버전을 명시하세요',
  },
  '__implicit__previous-baseline': {
    message: '"이전처럼" — 이전 기준이 명시되지 않음',
    detail: '이전 결과물 또는 기준을 구체적으로 참조하세요',
  },
  '__implicit__convention-assumed': {
    message: '"보통" — 프로젝트 컨벤션이 명시되지 않음',
    detail: '팀 또는 프로젝트별 컨벤션 문서를 참조하거나 명시하세요',
  },
  '__implicit__judgment-undefined': {
    message: '"알아서" — 판단 기준이 암묵적',
    detail: '어떤 기준으로 판단해야 할지 명시하세요',
  },
  '__implicit__condition-undefined': {
    message: '"필요하면" — 필요 조건이 정의되지 않음',
    detail: '어떤 상황에서 해당 동작을 수행해야 하는지 기준을 명시하세요',
  },
};

export const implicitAssumptionRule: Rule = {
  id: 'implicit-assumption',
  description: '명시되지 않은 암묵적 전제를 검출합니다',

  check(ast: CommandAST): LintMessage[] {
    const messages: LintMessage[] = [];

    for (const [key, info] of Object.entries(IMPLICIT_MESSAGES)) {
      if (ast.constraints[key] === 'true') {
        messages.push({
          ruleId: 'implicit-assumption',
          severity: 'warn',
          message: info.message,
          detail: info.detail,
          fixable: false,
        });
      }
    }

    return messages;
  },
};
