# Contributing to CcLint

## 개발 환경 설정

```bash
git clone https://github.com/seunggabi/cclint.git
cd cclint
npm install
npm run build
```

## 로컬 테스트

```bash
# 전역 링크로 테스트
npm link
cclint "커밋 메시지 잘 작성해줘"
```

## 새 규칙 추가

1. `src/types.ts`의 `RuleId`에 새 ID 추가
2. `src/rules/built-in/<rule-id>.ts` 파일 생성
3. `src/rules/index.ts`에 등록
4. `src/scorer/index.ts`의 `UNCERTAINTY`에 불확실성 계수 추가
5. `DEFAULT_CONFIG`에 기본 severity 설정

### 규칙 작성 원칙

- **Pure function**: 동일 AST → 동일 결과, 부작용 없음
- `ast.raw` 직접 접근 금지 → `ast.nodes`, `ast.constraints`만 사용
- 오탐(false positive) 최소화

```typescript
import type { Rule, CommandAST, LintMessage } from '../../types.js';

export const myRule: Rule = {
  id: 'my-rule',
  description: '규칙 설명',

  check(ast: CommandAST): LintMessage[] {
    const messages: LintMessage[] = [];
    // ast.nodes, ast.constraints, ast.qualifiers 사용
    return messages;
  },
};
```

## Pull Request

- `main` 브랜치 기준으로 PR
- 새 규칙은 테스트 케이스 포함
- `npm run build` 성공 확인 후 제출

## 버그 리포트

[GitHub Issues](https://github.com/seunggabi/cclint/issues)에 아래 내용을 포함해 주세요:
- 입력 커맨드
- 기대한 결과
- 실제 결과
