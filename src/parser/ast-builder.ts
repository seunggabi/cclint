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
  // 원래 10개
  { pattern: /기존|existing|현재|current/,         key: 'existing-state' },
  { pattern: /이전처럼|전처럼|like before/,         key: 'previous-baseline' },
  { pattern: /보통|일반적으로|normally|usually/,    key: 'convention-assumed' },
  { pattern: /알아서|자동으로|판단|상황에\s*맞게|auto(?:matically)?/,  key: 'judgment-undefined' },
  { pattern: /필요하면|if needed|필요시/,           key: 'condition-undefined' },
  { pattern: /회의|discussion|논의|meeting|언급|mention|회의에서|discussed/,  key: 'implicit-context' },
  { pattern: /지난번|이전에|그때|그\s*프로젝트|그\s*방식|그대로|last\s*time|previously|before|that\s*project/,  key: 'context-reference' },
  { pattern: /어떻게\s*알|어떻게\s*정|정의\s*없이|기준\s*없이|기준이\s*뭔지|정할\s*수\s*있을까|how\s*to\s*measure|how\s*to\s*define/,  key: 'measurement-undefined' },
  { pattern: /너가\s*판단|너가\s*합리적|너가\s*느껴보고|판단해줄래|판단해줘|내가\s*정확히\s*모르겠어|정의가\s*없는|정의가\s*안\s*됐어/,  key: 'delegation-undefined' },
  { pattern: /최소.*최대|빨리.*완벽|간단.*강력|최소한.*최대의|빨리.*정확|점진적.*빨리|단순.*확장성/,  key: 'impossible-tradeoff' },

  // 카테고리 1: 비즈니스 복잡도로 위장한 모호성
  { pattern: /마이크로서비스.{5,}(?:리스크|비용|복잡도)|(?:리스크|비용|복잡도).{5,}마이크로서비스|어느\s*정도\s*수준/i,  key: 'business-complexity-disguised' },

  // 카테고리 2: 맥락에 의존하는 모호성
  { pattern: /기억나|그때|그걸|그\s*방식|지난주|회의|선호하는/i,  key: 'context-dependent' },

  // 카테고리 3: 성공 기준이 불명확한 경우
  { pattern: /개선되었는지|어떻게\s*알|만족도|안정성|높여줘|좋아\s*보이면|어느\s*수준/i,  key: 'undefined-success-criteria' },

  // 카테고리 4: 트레이드오프가 명확하지 않은 경우 (이미 covered by impossible-tradeoff)
  { pattern: /성능.*가독성|가독성.*성능|두.*충돌|충돌할\s*때|우선할지/i,  key: 'unclear-tradeoff' },

  // 카테고리 5: 암묵적 가정과 도메인 지식
  { pattern: /우리\s*회사|항상\s*이런\s*식|업계\s*표준|권장한\s*방식|많이\s*하는\s*방법|일반적|너가\s*파악해줘|명시되지\s*않음/i,  key: 'implicit-domain-knowledge' },

  // 카테고리 6: 부정확한 범위 지정
  { pattern: /정리해줄건데|정리의\s*범위|침범적이진|리팩토링해줄건데|관련된\s*모든|너가\s*합리적|모든\s*문제|찾아서\s*고쳐줘/i,  key: 'vague-scope' },

  // 카테고리 7: 상충하는 요구사항
  { pattern: /최소한.*최대|점진적으로.*빨리|코드\s*리뷰\s*시간.*품질|팀이\s*빨리.*유지보수|단순.*확장성|신중하게/i,  key: 'conflicting-requirements' },

  // 카테고리 8: 데이터/요구사항 부족 + 판단 요구
  { pattern: /병목을\s*찾아서|임팩트.*구현|임팩트.*측정|버그들을\s*우선순위화|심각도.*측정|중요한\s*부분|너의\s*판단/i,  key: 'insufficient-data' },

  // 카테고리 9: 정성적 목표의 정량화 (명시적 판단 위임과 함께)
  { pattern: /(?:깔끔한|효율적인|우아한|강력한)(?:.*(?:코드|설계|아키텍처|솔루션))(?:.*(?:너가|판단|기준))|너가\s*느끼는\s*대로|최선의\s*판단으로/i,  key: 'qualitative-goals' },

  // 카테고리 10: 관계자 이해관계 충돌 (상충하는 요구사항과 함께)
  { pattern: /(?:PM|CTO|개발팀|스테이크홀더).*(?:요구|원하|원함)(?:.*다\s*만족|.*충돌|.*상충)|다양한\s*요구사항.*모두\s*수용|신입.*시니어.*동시에/i,  key: 'stakeholder-conflict' },

  // 카테고리 11: 마감이 임박하면서 동시에 품질 요구
  { pattern: /내일\s*아침|스프린트\s*끝|2일\s*남았어|마감.*임박|완성도\s*높게|버그\s*없어야|빨리.*품질/i,  key: 'deadline-with-quality' },

  // 카테고리 12: 암묵적 UI/UX 기준
  { pattern: /현대적으로|현대적|2024년|2025년|트렌드|직관적|통일감|개성|모바일\s*먼저|반응형|너의\s*감각/i,  key: 'implicit-ui-standards' },

  // 카테고리 13: 성능 개선의 정량화 실패
  { pattern: /성능을\s*개선|느린|얼마나\s*빨라져|응답\s*시간|측정\s*안\s*해봤|DB\s*쿼리.*최적화|메모리\s*사용량/i,  key: 'performance-quantification' },

  // 카테고리 14: 버그 픽스의 모호성
  { pattern: /몇몇\s*사용자|이상하다고|재현\s*방법|가끔\s*버그|언제\s*나타나|로그.*없어|코드\s*읽어보고/i,  key: 'vague-bug-report' },

  // 카테고리 15: 문서/설명 부재 + 구현 요청
  { pattern: /아키텍처\s*문서.*없어|비즈니스\s*로직.*코드로만|이전\s*개발자|주석.*없고|문서.*없어|파악한\s*다음에|리팩토링.*문서/i,  key: 'missing-documentation-context' },

  // 카테고리 16: 다중 언어/플랫폼/기술 스택의 모호성 (복수 기술 조합일 때만)
  { pattern: /(?:React|Python|Node\.js|PostgreSQL|Redis|iOS|Android).+(?:React|Python|Node\.js|PostgreSQL|Redis|iOS|Android|마이크로서비스)|마이크로서비스.*(?:React|Python|Node\.js|PostgreSQL|Redis)|3가지.*(?:React|Python|Node\.js|PostgreSQL|Redis|iOS|Android|마이크로서비스)/i,  key: 'multi-stack-ambiguity' },

  // 카테고리 17: 회사 정책/규정의 모호한 참조
  { pattern: /코딩\s*스탠다드|Compliance|보안\s*표준|법무팀|업계\s*표준|회사\s*표준|정확한.*요구사항|아직\s*못\s*찾았어/i,  key: 'undefined-policy-reference' },

  // 카테고리 18: "좋은 상태"의 정의 부재
  { pattern: /프로덕션\s*준비|릴리스\s*준비|엔터프라이즈급|신뢰성.*확보|완벽해야|문제없어야|조직마다|체크리스트/i,  key: 'undefined-good-state' },

  // 카테고리 19: 진화 요구 (끝이 없는)
  { pattern: /지속적으로\s*개선|진화시켜|계속\s*개선|변하는\s*요구사항|유연하게.*대응|우선순위.*매번/i,  key: 'endless-evolution' },

  // 카테고리 20: 의존성이 있지만 미정의된 경우
  { pattern: /인터페이스.*정의.*안\s*했|아직\s*정의.*안|API\s*스펙.*완성.*안\s*됐|문서.*없어.*코드\s*읽어보고|예상되는|가정해서/i,  key: 'undefined-dependency' },
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
