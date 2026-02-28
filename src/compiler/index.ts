import type { CommandAST } from '../types.js';
import { DOMAIN_CONSTRAINTS } from '../parser/tokenizer.js';

// ─── 구조화된 커맨드로 컴파일 ────────────────────────────────────────────────

export function compile(ast: CommandAST): Record<string, unknown> {
  const domain = ast.constraints['__domain__'];
  const base: Record<string, unknown> = {};

  if (!domain) {
    // 도메인 미감지: 의도 + 제약만 반환 (메타 키 __xxx__ 제외)
    if (ast.intent) base['action'] = ast.intent;
    for (const [k, v] of Object.entries(ast.constraints)) {
      if (!k.startsWith('__')) base[k] = v;
    }
    return base;
  }

  // 도메인별 구조 생성
  const struct: Record<string, unknown> = {};

  // 명시된 제약 조건 채우기
  for (const key of DOMAIN_CONSTRAINTS[domain] ?? []) {
    if (ast.constraints[key]) {
      struct[key] = ast.constraints[key];
    }
  }

  // 기타 명시된 값도 포함 (메타 키 __xxx__ 제외)
  for (const [k, v] of Object.entries(ast.constraints)) {
    if (!k.startsWith('__') && !(k in struct)) {
      struct[k] = v;
    }
  }

  base[domain] = struct;
  return base;
}
