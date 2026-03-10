import type { ASTNode, NodeType } from '../types.js';

// ─── 한국어/영어 어휘 사전 ────────────────────────────────────────────────────
// 규칙: 독립 어절(공백으로 분리된 단위)과 정확히 매칭해야 오탐 방지
// "잘" O  /  "잘못된" X  /  "잘작성" X

export const AMBIGUOUS_QUALIFIERS = new Set([
  // 한국어
  '잘', '적절히', '깔끔하게', '적당히', '편하게',
  '제대로', '올바르게', '알맞게', '적절하게',
  // 영어
  'well', 'properly', 'nicely', 'cleanly', 'appropriately',
  'efficiently', 'correctly', 'neatly',
]);

export const SUBJECTIVE_CRITERIA = new Set([
  // 한국어
  '예쁘게', '멋있게', '세련되게', '우아하게', '직관적으로',
  '읽기 좋게', '이해하기 쉽게', '보기 좋게', '자연스럽게',
  // 영어
  'beautifully', 'elegantly', 'intuitively', 'user-friendly',
]);

// ─── 도메인별 필수 제약 조건 ─────────────────────────────────────────────────

export const DOMAIN_CONSTRAINTS: Record<string, string[]> = {
  commit:    ['language', 'format', 'max-length'],
  test:      ['framework', 'coverage', 'target'],
  code:      ['language', 'style'],
  api:       ['method', 'endpoint', 'response-format'],
  deploy:    ['environment', 'strategy'],
  refactor:  ['scope', 'pattern'],
  document:  ['format', 'language'],
  translate: ['source-language', 'target-language'],
};

export const SCOPE_UNBOUNDED_KEYWORDS = new Set([
  '모든', '전체', '모두', '전부', 'all', 'every', 'entire', 'everything',
]);

// ─── 측정/성공 기준이 불명확한 패턴 ──────────────────────────────────────
export const MEASUREMENT_UNDEFINED_KEYWORDS = new Set([
  '어떻게 알', '어떻게 정', '정의', '기준이', '정할 수 있을까',
  'how do you', 'how to measure', 'how to define',
]);

// ─── 맥락 참조 패턴 ───────────────────────────────────────────────────────
export const CONTEXT_REFERENCE_KEYWORDS = new Set([
  '지난번', '이전에', '그때', '그 프로젝트', '그 방식', '그것', '그대로',
  'last time', 'previously', 'before', 'that project', 'that way',
]);

export const KEYWORD_TO_DOMAIN: Record<string, string> = {
  커밋: 'commit',  commit: 'commit',
  테스트: 'test',  test: 'test',
  코드: 'code',    code: 'code',
  api: 'api',      API: 'api',
  배포: 'deploy',  deploy: 'deploy',
  리팩토링: 'refactor', refactor: 'refactor',
  문서: 'document', document: 'document', docs: 'document',
  번역: 'translate', translate: 'translate',
};

// ─── Token / ASTNode 타입 ─────────────────────────────────────────────────────

export interface Token {
  type: NodeType;
  value: string;    // 정규화된 값 (조사 제거, 소문자)
  raw: string;      // 원본 어절
  start: number;
  end: number;
}

// ─── 한국어 조사 제거 ─────────────────────────────────────────────────────────
// 어절 끝의 조사/어미를 제거해 핵심 어근 추출
// "jest로" → "jest",  "80%로" → "80%",  "한국어로" → "한국어"
const KO_POSTFIX = /[으로로은는이가을를에서의도만과와한]$/;
const KO_VERB_ENDING = /해줘요?$|해주세요$|하세요$|해줄래요?$|해주시기$|해야$|할\s*것$|하시오$|해라$|합니다$/;

function stripPostfix(word: string): string {
  // 동사형 종결어미 제거
  let w = word.replace(KO_VERB_ENDING, '').trim();
  // 단일 조사 제거 (단, 제거 후 빈 문자열이 되면 원본 유지)
  const stripped = w.replace(KO_POSTFIX, '');
  return stripped.length > 0 ? stripped : w;
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

export function tokenize(command: string): Token[] {
  const tokens: Token[] = [];
  const words = command.split(/\s+/);
  let position = 0;

  for (const word of words) {
    if (!word) continue;
    const start = command.indexOf(word, position);
    const end = start + word.length;
    position = end;

    const normalized = stripPostfix(word.replace(/[.,!?~]+$/, '')).toLowerCase();
    const type = classifyToken(word, normalized);
    tokens.push({ type, value: normalized, raw: word, start, end });
  }

  return tokens;
}

function classifyToken(raw: string, normalized: string): NodeType {
  // 수식어: 정규화된 값이 사전에 정확히 있을 때만 (오탐 방지)
  if (AMBIGUOUS_QUALIFIERS.has(normalized) || SUBJECTIVE_CRITERIA.has(normalized)) {
    return 'qualifier';
  }
  // 범위: "모든", "전체", "all", "every" 로 시작하는 어절
  if (/^(모든|전체|모두|전부|all|every|entire)\b/.test(normalized)) {
    return 'scope';
  }
  // 의도: 동사형 종결어미 패턴
  if (KO_VERB_ENDING.test(raw) || /^(write|create|implement|add|fix|delete|refactor|test|commit|deploy|generate|optimize)\b/i.test(raw)) {
    return 'intent';
  }
  return 'command';
}

export function tokensToASTNodes(tokens: Token[]): ASTNode[] {
  return tokens.map(t => ({
    type: t.type,
    value: t.value,
    raw: t.raw,
    position: { start: t.start, end: t.end },
  }));
}
