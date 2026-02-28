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

export interface CommandLintConfig {
  rules: Partial<Record<RuleId, RuleConfig>>;
  custom?: CustomConfig;
}

export const DEFAULT_CONFIG: CommandLintConfig = {
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
