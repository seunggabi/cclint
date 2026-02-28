import type { LintMessage, LintResult, RuleId, Severity } from '../types.js';

// ─── 확률 기반 불확실성 전파 모델 (정보이론/확률론) ──────────────────────────
// 각 규칙 위반을 독립 사건으로 보고 곱으로 전파
// P_deterministic = Pi(1 - u_i)
// Score = round(10 * P_deterministic, 1)

type UncertaintyKey = `${RuleId}:${Severity}`;

const UNCERTAINTY: Record<string, number> = {
  'ambiguous-qualifier:error': 0.35,
  'ambiguous-qualifier:warn':  0.15,
  'missing-constraint:warn':   0.15,
  'conflicting-rules:error':   0.50,
  'implicit-assumption:warn':  0.10,
  'unbounded-scope:warn':      0.20,
  'no-subjective-criterion:warn': 0.15,
  'vague-quantifier:warn':     0.15,
  'no-rollback-plan:warn':     0.20,
};

// 미등록 조합에 대한 기본값
const DEFAULT_UNCERTAINTY: Record<Severity, number> = {
  error: 0.30,
  warn:  0.15,
  info:  0.05,
};

function getUncertainty(ruleId: RuleId, severity: Severity): number {
  const key: UncertaintyKey = `${ruleId}:${severity}`;
  return UNCERTAINTY[key] ?? DEFAULT_UNCERTAINTY[severity];
}

export function calculateScore(messages: LintMessage[]): number {
  // P_deterministic = Pi(1 - u_i)
  let pDeterministic = 1.0;

  for (const msg of messages) {
    const u = getUncertainty(msg.ruleId, msg.severity);
    pDeterministic *= (1 - u);
  }

  // Score = round(10 * P_deterministic, 1), 최소 1
  const raw = 10 * pDeterministic;
  return Math.max(1, Math.round(raw * 10) / 10);
}

export function getScoreLabel(score: number): string {
  if (score >= 9) return '거의 순수 함수 수준';
  if (score >= 7) return '대부분 예측 가능';
  if (score >= 5) return '결과가 상당히 달라질 수 있음';
  if (score >= 3) return '매번 다른 결과';
  return '랜덤에 가까움';
}

export function getScoreEmoji(score: number): string {
  if (score >= 9) return '🟢';
  if (score >= 7) return '🟡';
  if (score >= 5) return '🟠';
  if (score >= 3) return '🔴';
  return '⛔';
}

export function buildLintResult(
  command: string,
  messages: LintMessage[]
): LintResult {
  const score = calculateScore(messages);
  return {
    command,
    messages,
    score,
    scoreLabel: getScoreLabel(score),
    scoreEmoji: getScoreEmoji(score),
    errorCount: messages.filter(m => m.severity === 'error').length,
    warnCount: messages.filter(m => m.severity === 'warn').length,
  };
}
