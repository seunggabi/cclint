import type { CommandAST } from '../types.js';
import {
  tokenize,
  tokensToASTNodes,
  AMBIGUOUS_QUALIFIERS,
  SUBJECTIVE_CRITERIA,
  KEYWORD_TO_DOMAIN,
  DOMAIN_CONSTRAINTS,
} from './tokenizer.js';

// ─── 자연어 제약 조건 추출기 ─────────────────────────────────────────────────
// 목표: "jest로 테스트 코드 80% 커버리지로 src/**/*.ts 대상으로"
//        → { framework: "jest", coverage: "80%", target: "src/**/*.ts" }
// pure function: 동일 input → 항상 동일 output

type ConstraintExtractor = (command: string) => Partial<Record<string, string>>;

const EXTRACTORS: ConstraintExtractor[] = [

  // ── 프레임워크: "jest로", "vitest로", "mocha로", "pytest로" ───────────────
  (cmd) => {
    const frameworks = ['jest', 'vitest', 'mocha', 'jasmine', 'pytest', 'rspec', 'go test'];
    for (const fw of frameworks) {
      if (new RegExp(`\\b${fw}\\b`, 'i').test(cmd)) return { framework: fw };
    }
    return {};
  },

  // ── 커버리지: "80%", "80% 커버리지", "커버리지 80%" ─────────────────────
  (cmd) => {
    const m = cmd.match(/(\d+)\s*%\s*(커버리지|coverage)?|(커버리지|coverage)\s*:?\s*(\d+)\s*%/i);
    if (m) return { coverage: `${m[1] ?? m[4]}%` };
    return {};
  },

  // ── 파일 경로/glob 패턴: "src/**/*.ts", "*.py" ───────────────────────────
  (cmd) => {
    const m = cmd.match(/(?:^|\s)((?:[\w./]+\*[\w./*]*|[\w./]+\.(?:ts|js|py|go|rs|java|tsx|jsx))(?:\s|$))/);
    if (m) return { target: m[1].trim() };
    return {};
  },

  // ── 언어: "한국어로", "영어로", "in English", "in Korean" ────────────────
  (cmd) => {
    if (/한국어|korean|\bko\b/i.test(cmd)) return { language: 'ko' };
    if (/영어|english|\ben\b/i.test(cmd)) return { language: 'en' };
    if (/일본어|japanese|\bja\b/i.test(cmd)) return { language: 'ja' };
    return {};
  },

  // ── 포맷: "conventional-commits", "gitmoji", "markdown" ─────────────────
  (cmd) => {
    if (/conventional.?commit/i.test(cmd)) return { format: 'conventional-commits' };
    if (/gitmoji/i.test(cmd)) return { format: 'gitmoji' };
    if (/markdown/i.test(cmd)) return { format: 'markdown' };
    if (/json/i.test(cmd)) return { 'response-format': 'JSON' };
    return {};
  },

  // ── 길이 제한: "72자", "72자 이내", "max 72", "max-length=72" ─────────────
  (cmd) => {
    // 형식 1: 숫자+자/글자 (한국어)
    const m1 = cmd.match(/(\d+)\s*(?:자|글자|chars?|characters?)\s*(?:이내|미만|이하|max)?/i);
    if (m1) return { 'max-length': m1[1] };

    // 형식 2: max 숫자 (영어)
    const m2 = cmd.match(/max.{0,4}(\d+)/i);
    if (m2) return { 'max-length': m2[1] };

    // 형식 3: max-length=숫자, max_length=숫자, maxLength=숫자, max-lenght=숫자 (key=value)
    // typo 허용: lenght, length, -length, _length
    const m3 = cmd.match(/max[-_]?(?:lenght|length)\s*[=:]\s*(\d+)/i);
    if (m3) return { 'max-length': m3[1] };

    return {};
  },

  // ── HTTP 메서드 ──────────────────────────────────────────────────────────
  (cmd) => {
    const m = cmd.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/);
    if (m) return { method: m[1] };
    return {};
  },

  // ── 환경: "production", "staging", "개발 환경" ───────────────────────────
  (cmd) => {
    if (/\bproduction\b|프로덕션/i.test(cmd)) return { environment: 'production' };
    if (/\bstaging\b|스테이징/i.test(cmd)) return { environment: 'staging' };
    if (/\bdevelopment\b|개발\s*환경/i.test(cmd)) return { environment: 'development' };
    return {};
  },
];

// ─── 암묵적 전제 패턴 ────────────────────────────────────────────────────────
// pure: 패턴 리스트는 상수 → 동일 입력에 동일 결과
export const IMPLICIT_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /기존|existing|현재|current/,         key: 'existing-state' },
  { pattern: /이전처럼|전처럼|like before/,         key: 'previous-baseline' },
  { pattern: /보통|일반적으로|normally|usually/,    key: 'convention-assumed' },
  { pattern: /알아서|자동으로|auto(?:matically)?/,  key: 'judgment-undefined' },
  { pattern: /필요하면|if needed|필요시/,           key: 'condition-undefined' },
];

// ─── buildAST (pure function) ─────────────────────────────────────────────────

export function buildAST(command: string): CommandAST {
  const tokens  = tokenize(command);
  const nodes   = tokensToASTNodes(tokens);

  // 수식어 수집 (정확히 매칭된 것만)
  const qualifiers: string[] = tokens
    .filter(t => t.type === 'qualifier')
    .map(t => t.value);

  // 의도 (첫 번째 intent 토큰)
  const intent = tokens.find(t => t.type === 'intent')?.value;

  // 범위
  const scope = tokens.find(t => t.type === 'scope')?.raw;

  // 도메인 감지
  const domain = detectDomain(command);

  // 제약 조건: 모든 extractor 결과를 병합 (pure: 각 extractor가 독립)
  const extracted: Record<string, string> = {};
  for (const extractor of EXTRACTORS) {
    Object.assign(extracted, extractor(command));
  }

  const constraints: Record<string, string> = { ...extracted };
  if (domain) constraints['__domain__'] = domain;

  // 암묵적 전제 감지 (플래그만 기록)
  for (const { pattern, key } of IMPLICIT_PATTERNS) {
    if (pattern.test(command)) constraints[`__implicit__${key}`] = 'true';
  }

  return { raw: command, nodes, intent, qualifiers, constraints, scope };
}

function detectDomain(command: string): string | undefined {
  for (const [keyword, domain] of Object.entries(KEYWORD_TO_DOMAIN)) {
    if (command.includes(keyword)) return domain;
  }
  return undefined;
}

export function getMissingConstraints(ast: CommandAST): string[] {
  const domain = ast.constraints['__domain__'];
  if (!domain) return [];
  const required = DOMAIN_CONSTRAINTS[domain] ?? [];
  // 이미 추출된 제약만 제외 (메타 키 __xxx__ 제외)
  const present = new Set(
    Object.keys(ast.constraints).filter(k => !k.startsWith('__'))
  );
  return required.filter(c => !present.has(c));
}
