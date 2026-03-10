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
    message: '"판단" — 판단 기준이 암묵적',
    detail: '어떤 기준으로 판단해야 할지 명시하세요',
  },
  '__implicit__condition-undefined': {
    message: '"필요하면" — 필요 조건이 정의되지 않음',
    detail: '어떤 상황에서 해당 동작을 수행해야 하는지 기준을 명시하세요',
  },
  '__implicit__implicit-context': {
    message: '"회의에서 논의한" — 암묵적 문맥 참조',
    detail: '회의 기록 링크, 결정사항, 또는 이전 대화를 명시적으로 제공하세요',
  },
  '__implicit__context-reference': {
    message: '"지난번에" — 과거 작업 참조 (맥락 부재)',
    detail: '구체적인 작업명, PR, 날짜, 또는 문서 링크를 제공하세요',
  },
  '__implicit__measurement-undefined': {
    message: '"어떻게 알 수 있을까?" — 성공 기준이 불명확',
    detail: '측정 가능한 성공 지표, 기준, 또는 목표를 정의하세요',
  },
  '__implicit__delegation-undefined': {
    message: '"너가 판단해줘" — 판단/선택을 위임',
    detail: '의사결정 기준을 명시하거나 선택지를 제시하세요',
  },
  '__implicit__impossible-tradeoff': {
    message: '"최소한의 변경으로 최대의 효과" — 상충하는 요구',
    detail: '불가능한 트레이드오프입니다. 우선순위를 명시하세요',
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
