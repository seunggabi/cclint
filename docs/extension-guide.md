# 확장 가이드

## 커스텀 CommandSchema 정의

새로운 도메인이나 작업 유형을 추가하여 CcLint를 확장할 수 있습니다.

---

## 1. 새로운 도메인 추가

### 단계 1: .cclintrc에 도메인 정의

프로젝트 루트에 `.cclintrc` 파일을 생성하거나 수정합니다:

```yaml
custom:
  domains:
    # 기존 도메인들
    deploy:
      required: [environment, strategy, rollback-plan]

    # 새로운 도메인 추가
    api-gateway:
      required: [framework, rate-limit, timeout]

    database-migration:
      required: [database, strategy, backup-plan]
```

### 단계 2: 파라미터 정의

`required` 필드에 필수 파라미터를 나열합니다:

```yaml
custom:
  domains:
    cache-optimization:
      required: [cache-strategy, ttl, invalidation-pattern]
      optional: [redis-cluster-size, compression]
```

### 단계 3: 사용

```bash
# 정의된 파라미터가 모두 포함되어야 높은 Codification Score
cclint "Redis로 TTL 1시간, LRU eviction 정책으로 cache optimization 구현해줄래?"
```

---

## 2. 새로운 작업 유형 (Operation) 추가

기본 작업 유형: `improve`, `refactor`, `add`, `fix`, `test`, `deploy`

커스텀 작업 유형 추가:

```yaml
custom:
  operations:
    - name: migrate
      description: "데이터 마이그레이션"
      required_domains: [database-migration]

    - name: integrate
      description: "시스템 통합"
      required_domains: [api-gateway, data-pipeline]
```

---

## 3. 예제: Database Migration 도메인 추가

### .cclintrc 설정

```yaml
rules:
  ambiguous-qualifier: error
  missing-constraint: warn
  conflicting-rules: error
  implicit-assumption: warn
  unbounded-scope: warn
  no-subjective-criterion: warn
  vague-quantifier: warn
  no-rollback-plan: warn

custom:
  domains:
    database-migration:
      required:
        - database          # PostgreSQL, MySQL, MongoDB 등
        - strategy          # zero-downtime, blue-green, rolling
        - backup-plan       # 롤백 계획
        - validation        # 마이그레이션 검증 방식
      optional:
        - rollback-timeout  # 롤백 타임아웃
        - data-validation   # 데이터 검증 규칙
```

### 사용 예제

```bash
# ❌ 낮은 Codification Score
cclint "데이터베이스 마이그레이션 해줄래?"

# 응답:
# codificationScore: 0
# issues:
#   - parameter: "database"
#   - parameter: "strategy"
#   - parameter: "backup-plan"
#   - parameter: "validation"

# ✅ 높은 Codification Score
cclint "PostgreSQL에서 MySQL로 zero-downtime 마이그레이션, 롤백은 덤프 복구, 검증은 row count + checksum 확인해줄래?"

# 응답:
# codificationScore: 100
# analysis:
#   codifiedCount: 4
#   undefinedCount: 0
#   issues: []
```

---

## 4. 예제: 복합 도메인 정의

여러 도메인이 결합된 복잡한 작업:

```yaml
custom:
  domains:
    # 간단한 도메인
    code-quality:
      required: [metric, threshold, linter]

    # 복합 도메인 (여러 서브-도메인)
    performance-optimization:
      required: [metric, threshold, scope]
      sub-domains:
        - database-query
        - cache-strategy
        - api-response-time
      optional: [profiling-tool, baseline-metric]

    infrastructure-upgrade:
      required: [component, target-version, strategy, validation]
      sub-domains:
        - kubernetes-upgrade
        - load-balancer-config
        - monitoring-setup
      optional: [canary-percentage, health-check-endpoint]
```

### 사용

```bash
# 단일 도메인
cclint "순환 복잡도를 10 이하로, ESLint 0 errors로"

# 복합 도메인
cclint "응답시간을 30% 단축, DB 쿼리 최적화 + Redis 캐싱, 로드테스트 1000 RPS 검증"
```

---

## 5. 조직별 커스텀 규칙

팀이나 조직의 커맨드 규칙을 정의할 수 있습니다:

```yaml
custom:
  # 조직 규칙
  organization-rules:
    always-specify:
      - environment      # 배포 시 항상 환경 명시
      - rollback-plan    # 위험한 작업은 롤백 계획 필수
      - owner            # 모든 작업에 담당자 지정

    never-use:
      - "최대한"
      - "가능하면"
      - "어떻게든"

  # 팀별 규칙
  teams:
    backend:
      required-domains: [database-migration, api-gateway]
      forbidden-keywords: [frontend, UI, CSS]

    frontend:
      required-domains: [ui-component, accessibility]
      forbidden-keywords: [database, migration, query]
```

---

## 6. 언어별 파라미터

다국어 커맨드 지원:

```yaml
custom:
  languages:
    ko:
      operations:
        improve: ["개선", "향상", "최적화"]
        refactor: ["리팩토링", "정리", "재구성"]
        fix: ["수정", "고치다", "해결"]

      parameters:
        metric: ["지표", "메트릭", "기준"]
        threshold: ["한계", "임계값", "목표값"]

    en:
      operations:
        improve: ["improve", "enhance", "optimize"]
        refactor: ["refactor", "clean", "restructure"]
        fix: ["fix", "resolve", "patch"]

      parameters:
        metric: ["metric", "measure", "indicator"]
        threshold: ["threshold", "limit", "target"]
```

---

## 7. 런타임 확장

프로그래매틱하게 CommandSchema 추가:

```typescript
// custom-analyzer.ts
import { CommandSchema, CommandParameter } from '@seunggabi/cclint';

export const customSchemas: Record<string, CommandSchema> = {
  ml-training: {
    name: "ml_training",
    operation: "train",
    target: "machine-learning",
    parameters: [
      {
        name: "framework",
        type: "enum",
        required: true,
        enum: ["pytorch", "tensorflow", "jax"],
        description: "ML 프레임워크"
      },
      {
        name: "dataset_size",
        type: "number",
        required: true,
        description: "학습 데이터 크기"
      },
      {
        name: "epochs",
        type: "number",
        required: true,
        description: "학습 반복 횟수"
      },
      {
        name: "validation_metric",
        type: "enum",
        required: true,
        enum: ["accuracy", "f1", "auc"],
        description: "검증 지표"
      }
    ],
    codificationScore: 0,
    analysis: {
      codifiedCount: 0,
      undefinedCount: 0,
      issues: []
    }
  }
};
```

---

## 8. 테스트

새로운 도메인이 정상 작동하는지 테스트합니다:

```bash
# 1. 낮은 점수 테스트 (필수 파라미터 없음)
cclint "ML 모델 학습해줄래?"

# 예상: codificationScore < 50

# 2. 높은 점수 테스트 (모든 필수 파라미터 포함)
cclint "PyTorch로 100 epochs, accuracy 기준으로, ImageNet 데이터셋으로 학습해줄래?"

# 예상: codificationScore >= 80

# 3. JSON 형식으로 상세 확인
cclint --json "PyTorch로 100 epochs, accuracy 기준으로, ImageNet 데이터셋으로 학습해줄래?" | jq .schema
```

---

## 9. 확장 예제: CI/CD 도메인

```yaml
custom:
  domains:
    ci-pipeline:
      required:
        - trigger-event      # push, pull-request, schedule 등
        - language           # javascript, python, go 등
        - test-framework     # jest, pytest, go test 등
        - coverage-threshold # 80, 90 등
      optional:
        - matrix-strategy    # os, node-version 등
        - timeout            # 분 단위 제한
        - notification       # slack, email 등

    cd-deployment:
      required:
        - environment        # staging, production
        - strategy          # blue-green, canary, rolling
        - health-check      # endpoint + success-criteria
        - rollback-trigger   # 롤백 조건
      optional:
        - traffic-percentage # canary용
        - approval-required  # 수동 승인
```

사용:
```bash
# CI 파이프라인
cclint "GitHub push 시 Jest 커버리지 80%, Node 18-20, timeout 10분으로 자동 테스트"

# CD 배포
cclint "production에 blue-green 배포, 헬스체크 /health 200 OK, 5분 내 이상 시 자동 롤백"
```

---

## 10. 문제 해결

### 커스텀 도메인이 인식되지 않음

```bash
# 1. .cclintrc 위치 확인
ls -la .cclintrc

# 2. 문법 확인 (YAML)
cat .cclintrc | head -20

# 3. CcLint 재시작
cclint "test"
```

### Codification Score가 계산되지 않음

```bash
# 1. 필수 파라미터 명시적으로 포함
cclint --json "..." | jq .schema.parameters

# 2. 파라미터 이름 정확성 확인
# .cclintrc의 required 필드와 정확히 매치되어야 함
```

---

## 참고

- [Codification Analysis API](./codification-api.md)
- [에러 처리 가이드](./error-handling.md)
- [CcLint GitHub](https://github.com/seunggabi/cclint)
