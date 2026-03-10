# Codification Analysis API

## 개요

Codification Analysis는 AI 커맨드를 구조화된 Schema로 변환하고, 각 파라미터의 **명확성(Codification Score)**을 분석합니다.

**핵심 개념**:
- **Codified 파라미터**: 값이 정확히 정의된 파라미터 (예: "500ms", "ESLint 0 errors")
- **Undefined 파라미터**: 값이 모호하거나 누락된 파라미터 (예: "개선", "최적화")
- **Codification Score**: (정의된 필수 파라미터 / 전체 필수 파라미터) × 100

---

## CommandSchema

AI 커맨드를 구조화한 스키마입니다.

```typescript
interface CommandSchema {
  name: string;                    // "improve_performance"
  description: string;             // 커맨드 설명
  operation: string;               // "improve", "refactor", "add", "fix"
  target: string;                  // "performance", "code", "test"
  parameters: CommandParameter[];
  codificationScore: number;       // 0-100
  analysis: {
    codifiedCount: number;
    undefinedCount: number;
    issues: Array<{
      parameter: string;
      reason: string;
      suggestion: string;
    }>;
  };
}
```

### 필드 설명

| 필드 | 설명 | 예시 |
|------|------|------|
| `name` | 정규화된 커맨드 이름 | `improve_performance` |
| `operation` | 작업 유형 | `improve`, `refactor`, `add`, `fix`, `test`, `deploy` |
| `target` | 대상 도메인 | `performance`, `code`, `test`, `security` |
| `parameters` | 추출된 파라미터 배열 | — |
| `codificationScore` | 명확성 점수 (0-100) | `65` |
| `analysis.codifiedCount` | 정의된 파라미터 수 | `2` |
| `analysis.undefinedCount` | 미정의 파라미터 수 | `1` |
| `analysis.issues` | 미정의 파라미터 목록 | — |

---

## CommandParameter

개별 파라미터의 상세 정보입니다.

```typescript
interface CommandParameter {
  name: string;                    // "response_time"
  type: ParameterType;             // "metric", "number", "string", "enum"
  required: boolean;               // true = 필수, false = 선택
  value?: string | number | boolean | string[];
  enum?: string[];                 // 가능한 값 목록
  example?: string;                // "500ms", "10s"
  description?: string;
  codified: boolean;               // true = 값 정의됨, false = 미정의
}
```

### ParameterType

| 타입 | 설명 | 예시 |
|------|------|------|
| `metric` | 측정 지표 | "응답시간", "CPU 사용률" |
| `number` | 숫자 값 | `500`, `80` |
| `string` | 문자열 | `"production"`, `"blue-green"` |
| `enum` | 선택지 | `["staging", "production"]` |
| `boolean` | 참/거짓 | `true`, `false` |
| `array` | 배열 | `["src/**/*.ts", "test/**/*.ts"]` |

---

## CodificationResult

분석 결과의 최상위 응답입니다.

```typescript
interface CodificationResult {
  command: string;                 // 원본 커맨드
  schema: CommandSchema;
  determinism: {
    score: number;                 // Determinism Score (1-10)
    level: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}
```

---

## 사용 예제

### 예제 1: 모호한 성능 개선 요청

```bash
cclint --suggest "성능을 개선해줄래?"
```

**응답**:
```json
{
  "command": "성능을 개선해줄래?",
  "schema": {
    "name": "improve_performance",
    "operation": "improve",
    "target": "performance",
    "parameters": [
      {
        "name": "metric",
        "type": "metric",
        "required": true,
        "codified": false,
        "description": "측정 기준 (응답시간, CPU, 메모리 등)"
      },
      {
        "name": "threshold",
        "type": "number",
        "required": false,
        "codified": false,
        "description": "목표 수치"
      }
    ],
    "codificationScore": 0,
    "analysis": {
      "codifiedCount": 0,
      "undefinedCount": 2,
      "issues": [
        {
          "parameter": "metric",
          "reason": "측정 기준 미지정",
          "suggestion": "응답시간(ms), CPU 사용률(%), 메모리(MB) 중 선택"
        },
        {
          "parameter": "threshold",
          "reason": "목표 수치 미지정",
          "suggestion": "예: '500ms 이하', '80% 이하'"
        }
      ]
    }
  },
  "determinism": {
    "score": 3,
    "level": "LOW"
  }
}
```

### 예제 2: 부분 명확한 성능 개선 요청

```bash
cclint --suggest "응답시간을 500ms 이하로 개선해줄래?"
```

**응답**:
```json
{
  "command": "응답시간을 500ms 이하로 개선해줄래?",
  "schema": {
    "name": "improve_performance",
    "operation": "improve",
    "target": "performance",
    "parameters": [
      {
        "name": "metric",
        "type": "metric",
        "required": true,
        "value": "응답시간",
        "codified": true
      },
      {
        "name": "threshold",
        "type": "number",
        "required": true,
        "value": "500ms",
        "codified": true
      },
      {
        "name": "scope",
        "type": "string",
        "required": false,
        "codified": false,
        "description": "대상 범위 (모든 엔드포인트 vs 특정 엔드포인트)"
      }
    ],
    "codificationScore": 66,
    "analysis": {
      "codifiedCount": 2,
      "undefinedCount": 1,
      "issues": [
        {
          "parameter": "scope",
          "reason": "적용 범위 미지정",
          "suggestion": "예: '모든 API', '/api/users 엔드포인트', '페이지 로드 시간'"
        }
      ]
    }
  },
  "determinism": {
    "score": 6,
    "level": "MEDIUM"
  }
}
```

### 예제 3: 완전히 명확한 코드 품질 요청

```bash
cclint --suggest "순환 복잡도를 10 이하로, ESLint 0 errors로"
```

**응답**:
```json
{
  "command": "순환 복잡도를 10 이하로, ESLint 0 errors로",
  "schema": {
    "name": "refactor_code_quality",
    "operation": "refactor",
    "target": "code_quality",
    "parameters": [
      {
        "name": "cyclomatic_complexity",
        "type": "number",
        "required": true,
        "value": 10,
        "codified": true,
        "example": "10"
      },
      {
        "name": "linter",
        "type": "enum",
        "required": true,
        "value": "ESLint",
        "codified": true,
        "enum": ["ESLint", "Prettier", "TypeScript"]
      },
      {
        "name": "error_count",
        "type": "number",
        "required": true,
        "value": 0,
        "codified": true
      }
    ],
    "codificationScore": 100,
    "analysis": {
      "codifiedCount": 3,
      "undefinedCount": 0,
      "issues": []
    }
  },
  "determinism": {
    "score": 10,
    "level": "HIGH"
  }
}
```

---

## Codification Score 해석

| 점수 | 의미 | 상태 |
|------|------|------|
| 0-30 | 매우 모호 | ⛔ 거의 모든 파라미터 미정의 |
| 31-60 | 부분 명확 | 🟠 일부 필수 파라미터 누락 |
| 61-100 | 완전 명확 | 🟢 모든 필수 파라미터 정의됨 |

---

## 도메인별 필수 파라미터

### Performance (성능)

```yaml
operation: improve
required_parameters:
  - metric        # 측정 지표 (응답시간, CPU, 메모리 등)
  - threshold     # 목표 수치 (500ms, 80% 등)
  - scope         # 적용 범위 (선택)
```

### Code Quality (코드 품질)

```yaml
operation: refactor
required_parameters:
  - metric        # 복잡도, 커버리지, 중복도 등
  - target        # 대상 (ESLint, Prettier, TypeScript 등)
  - threshold     # 목표값
```

### Testing (테스트)

```yaml
operation: test
required_parameters:
  - framework     # Jest, Vitest, Mocha 등
  - coverage      # 목표 커버리지 (80%, 100% 등)
  - scope         # 대상 파일 (src/**, test/** 등)
```

### Deployment (배포)

```yaml
operation: deploy
required_parameters:
  - environment   # staging, production 등
  - strategy      # blue-green, canary, rolling 등
  - rollback_plan # 롤백 계획 (필수)
```

---

## 에러 처리

분석이 실패하는 경우:

```json
{
  "error": "InvalidCommand",
  "message": "커맨드 파싱 실패",
  "command": "..."
}
```

자세한 내용은 [에러 처리 가이드](./error-handling.md)를 참고하세요.

---

## 확장

커스텀 도메인을 추가하려면 [확장 가이드](./extension-guide.md)를 참고하세요.
