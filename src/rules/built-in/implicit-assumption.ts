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
  '__implicit__business-complexity-disguised': {
    message: '"어느 정도 수준" — 비즈니스 복잡도가 모호성을 숨김',
    detail: '리스크, 비용, 성능 개선 정도를 구체적 수치로 명시하세요',
  },
  '__implicit__context-dependent': {
    message: '"지난번 그 방식처럼" — 맥락 종속적 요청',
    detail: '구체적인 참조 대상(PR, 커밋, 문서)을 명시하세요',
  },
  '__implicit__undefined-success-criteria': {
    message: '"개선되었는지 어떻게 알 수 있을까?" — 성공 기준 불명확',
    detail: '측정 가능한 지표(성능 수치, 사용자 만족도 등)를 정의하세요',
  },
  '__implicit__unclear-tradeoff': {
    message: '"성능과 가독성 모두 높여줘" — 명확하지 않은 트레이드오프',
    detail: '충돌 시 우선순위를 명시하세요 (예: 성능 > 가독성)',
  },
  '__implicit__implicit-domain-knowledge': {
    message: '"우리 회사에서는 항상 이렇게 해왔으니" — 암묵적 도메인 지식 가정',
    detail: '프로젝트별 컨벤션, 표준, 또는 가이드라인 문서를 참조하거나 명시하세요',
  },
  '__implicit__vague-scope': {
    message: '"저 디렉토리를 정리해줄건데, 정리의 범위는..." — 범위 지정 모호',
    detail: '정확히 어느 수준까지 변경하는지(파일 삭제, 리팩토링 깊이 등)를 명시하세요',
  },
  '__implicit__conflicting-requirements': {
    message: '"최소한의 변경으로 최대의 효과를 내되, 대수술도 필요할 수 있어" — 상충하는 요구',
    detail: '우선순위를 명시하세요. 점진적 vs 대수술, 속도 vs 정확성 중 어느 것이 중요한가요?',
  },
  '__implicit__insufficient-data': {
    message: '"병목을 찾아서 개선해줄래? (프로파일링 데이터는 없지만)" — 데이터 부족 + 판단 위임',
    detail: '필요한 데이터를 먼저 수집하거나, 판단 기준을 명시하세요',
  },
  '__implicit__qualitative-goals': {
    message: '"깔끔한 코드로" — 정성적 목표의 정량화 실패',
    detail: '객관적 기준(테스트 커버리지, Linter 점수, 순환 복잡도 등)을 명시하세요',
  },
  '__implicit__stakeholder-conflict': {
    message: '"PM, CTO, 개발팀 모두의 요구를 만족시켜줄래?" — 관계자 이해관계 충돌',
    detail: '우선순위를 결정하고, 불가능한 요구사항이 있으면 명시적으로 조정하세요',
  },
  '__implicit__deadline-with-quality': {
    message: '"내일 아침 9시까지 완료하되 완성도 높게" — 마감 임박 + 품질 요구',
    detail: '마감을 만족시키거나 품질을 만족시킬 중 어느 것이 우선인지 명시하세요',
  },
  '__implicit__implicit-ui-standards': {
    message: '"현대적인 UI로 개선해줄래?" — 암묘적 UI/UX 기준',
    detail: '구체적 기준(디자인 시스템 링크, 색상 팔레트, 레이아웃 원칙 등)을 제시하세요',
  },
  '__implicit__performance-quantification': {
    message: '"성능을 개선해줄래?" — 성능 개선의 정량화 실패',
    detail: '구체적 목표(응답시간 <100ms, 처리량 >1000 req/s 등)를 명시하세요',
  },
  '__implicit__vague-bug-report': {
    message: '"몇몇 사용자들이 이상하다고 하는데, 정확한 재현 방법은 없어" — 버그 픽스 모호',
    detail: '재현 방법, 에러 로그, 또는 영향받는 사용자 범위를 명시하세요',
  },
  '__implicit__missing-documentation-context': {
    message: '"아키텍처 문서가 없어. 새로 오는 사람들이 이해할 수 있도록 해줄래?" — 문서 부재 + 구현 요청',
    detail: '먼저 현재 상태를 분석한 후 어떤 문서가 필요한지 정의하세요',
  },
  '__implicit__multi-stack-ambiguity': {
    message: '"React, Python, PostgreSQL 혼합 프로젝트인데 모든 계층에서 일관성 있게 개선해줄래?" — 다중 기술 스택',
    detail: '각 계층별로 구체적인 개선 기준과 일관성 지표를 명시하세요',
  },
  '__implicit__undefined-policy-reference': {
    message: '"우리 회사의 코딩 스탠다드를 따라줄래? (문서는 아직 못 찾았어...)" — 회사 정책 참조 모호',
    detail: '정책 문서를 먼저 제공하거나, 없으면 기준을 직접 명시하세요',
  },
  '__implicit__undefined-good-state': {
    message: '"프로덕션 준비 상태로 만들어줄래?" — "좋은 상태"의 정의 부재',
    detail: '프로덕션 준비의 구체적 기준(테스트, 문서, 성능, 보안 등)을 정의하세요',
  },
  '__implicit__endless-evolution': {
    message: '"지속적으로 개선하면서 진화시켜줄래?" — 진화 요구 (끝이 없는)',
    detail: '개선의 범위와 시간 제한을 명시하세요. 언제까지, 어느 수준까지인가요?',
  },
  '__implicit__undefined-dependency': {
    message: '"다른 팀의 인터페이스를 아직 정의하지 않았는데 가정해서 구현해줄 수 있을까?" — 의존성 미정의',
    detail: '인터페이스 스펙을 먼저 정의하거나, 임시 구현임을 명시적으로 마크하세요',
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
