// ─── AST 노드 타입 ───────────────────────────────────────────────────────────

export type NodeType =
  | 'command'       // 전체 커맨드 루트
  | 'intent'        // 의도 (동사구)
  | 'qualifier'     // 수식어
  | 'constraint'    // 제약 조건
  | 'scope'         // 범위/대상
  | 'conjunction';  // 연결어

export interface ASTNode {
  type: NodeType;
  value: string;
  raw: string;
  position: { start: number; end: number };
  children?: ASTNode[];
}

export interface CommandAST {
  raw: string;
  nodes: ASTNode[];
  intent?: string;
  qualifiers: string[];
  constraints: Record<string, string>;
  scope?: string;
}

// ─── 규칙 타입 ────────────────────────────────────────────────────────────────

export type Severity = 'error' | 'warn' | 'info';

export type RuleId =
  | 'ambiguous-qualifier'
  | 'missing-constraint'
  | 'conflicting-rules'
  | 'implicit-assumption'
  | 'unbounded-scope'
  | 'no-subjective-criterion'
  | 'vague-quantifier'
  | 'no-rollback-plan';

export interface LintMessage {
  ruleId: RuleId;
  severity: Severity;
  message: string;
  detail?: string;
  position?: { start: number; end: number };
  fixable?: boolean;
}

export interface LintResult {
  command: string;
  messages: LintMessage[];
  score: number;
  scoreLabel: string;
  scoreEmoji: string;
  errorCount: number;
  warnCount: number;
}

// ─── 규칙 인터페이스 ─────────────────────────────────────────────────────────

export interface Rule {
  id: RuleId;
  description: string;
  check(ast: CommandAST): LintMessage[];
}

// ─── Fixer 타입 ───────────────────────────────────────────────────────────────

export interface FixSuggestion {
  description: string;
  yaml: Record<string, unknown>;
  scoreAfterFix: number;
}

// ─── Config 타입 ─────────────────────────────────────────────────────────────

export type RuleConfig = 'error' | 'warn' | 'off';

export interface CustomConfig {
  language?: string;
  domains?: Record<string, { required: string[] }>;
}

export interface CcLintConfig {
  rules: Partial<Record<RuleId, RuleConfig>>;
  custom?: CustomConfig;
}

export const DEFAULT_CONFIG: CcLintConfig = {
  rules: {
    'ambiguous-qualifier': 'error',
    'missing-constraint': 'warn',
    'conflicting-rules': 'error',
    'implicit-assumption': 'warn',
    'unbounded-scope': 'warn',
    'no-subjective-criterion': 'warn',
    'vague-quantifier': 'warn',
    'no-rollback-plan': 'warn',
  },
};

// ─── 코드화 분석 (Codification Analysis) ──────────────────────────────────

export type ParameterType = 'metric' | 'number' | 'string' | 'enum' | 'boolean' | 'array';

export interface CommandParameter {
  name: string;
  type: ParameterType;
  required: boolean;
  value?: string | number | boolean | string[];
  enum?: string[];
  example?: string;
  description?: string;
  codified: boolean; // true = 값이 정의됨, false = 값이 undefined
}

export interface CommandSchema {
  name: string;                    // "improve_performance"
  description: string;
  operation: string;               // "improve", "refactor", "add"
  target: string;                  // "performance", "code", "test"
  parameters: CommandParameter[];
  codificationScore: number;       // 0-100: (정의된 required params / 전체 required params) * 100
  analysis: {
    codifiedCount: number;         // 정의된 파라미터 수
    undefinedCount: number;        // 미정의 파라미터 수
    issues: Array<{
      parameter: string;
      reason: string;
      suggestion: string;
    }>;
  };
}

export interface CodificationResult {
  command: string;
  schema: CommandSchema;
  determinism: {
    score: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}
