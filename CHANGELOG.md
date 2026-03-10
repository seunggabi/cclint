# CHANGELOG

모든 주요 변경사항은 이 파일에 문서화됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)를 따르고,
버전 관리는 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 따릅니다.

---

## [0.5.0] - 2026-03-11

### Added

- ✨ **Codification Analysis (Beta)**: AI 커맨드의 명확성을 구조화된 Schema로 분석
  - CommandSchema: 커맨드를 JSON으로 정규화
  - Codification Score: 파라미터 정의도 기반 명확성 점수 (0-100)
  - 도메인별 필수 파라미터 분석
  - 미정의 파라미터 자동 감지 및 개선 제안

- 📚 **API 문서 추가**:
  - `docs/codification-api.md`: CommandSchema, CommandParameter, CodificationResult 상세 스펙
  - `docs/error-handling.md`: 일반적인 오류와 해결책
  - `docs/extension-guide.md`: 커스텀 도메인/파라미터 추가 방법

- 🔧 **타입 확장** (`src/types.ts`):
  - `CommandSchema` 인터페이스 추가
  - `CommandParameter` 인터페이스 추가
  - `CodificationResult` 인터페이스 추가
  - `ParameterType`: `'metric' | 'number' | 'string' | 'enum' | 'boolean' | 'array'`

- 📖 **README.md 업데이트**:
  - Codification Analysis 섹션 추가
  - 사용 예제 (5가지 실제 시나리오) 추가
  - Codification Score 설명 추가

### Improved

- 🎯 **implicit-assumption 규칙 확장**:
  - 복잡한 모호성 패턴 감지 개선
  - 암묵적 전제 검출 정확도 향상

- 🔍 **AST 파서 개선**:
  - 더 정확한 커맨드 구조 분석
  - 중첩된 제약 조건 올바르게 파싱

- 📊 **점수 계산 모델**:
  - Codification Score와 Determinism Score 독립적 계산
  - 도메인별 필수 파라미터 기반 정확한 점수

### Fixed

- 🐛 **max-length 규칙 개선**:
  - key=value 형식 지원 추가 (예: `max-length: 72`)

### Documentation

- 🗂️ **docs/ 디렉토리 생성**:
  - `codification-api.md`: API 상세 스펙 + 예제
  - `error-handling.md`: 에러 해결 가이드
  - `extension-guide.md`: 확장 가이드

### Examples

**예제 1: 완전 모호** (Score: 0)
```bash
$ cclint --suggest "성능을 개선해줄래?"
codificationScore: 0
issues:
  - metric 미지정
  - threshold 미지정
```

**예제 2: 부분 명확** (Score: 66)
```bash
$ cclint --suggest "응답시간을 500ms 이하로 개선해줄래?"
codificationScore: 66
issues:
  - scope 미지정
```

**예제 3: 완전 명확** (Score: 100)
```bash
$ cclint --suggest "순환 복잡도를 10 이하로, ESLint 0 errors로"
codificationScore: 100
issues: []
```

---

## [0.4.0] - 2026-02-15

### Added

- 🎯 **implicit-assumption 규칙**: "기존처럼", "알아서" 등 암묵적 전제 감지
- 🔄 **--watch 모드**: 파일 변경 감시 후 자동 re-lint
- ⚙️ **파일 감시 기능** (`src/watch/index.ts`)

### Improved

- 📋 **규칙 엔진 확장**: 복합 패턴 매칭 개선
- 🎨 **CLI 출력**: 더 명확한 메시지 포맷

### Fixed

- 🐛 **conflicting-rules**: 한국어 대비 + 반대 개념 쌍 감지 개선

---

## [0.3.0] - 2026-01-20

### Added

- 🤖 **Claude AI 통합** (`src/suggest/index.ts`):
  - `claude -p` 커맨드를 통한 AI 개선안 자동 생성
  - `--suggest`: Claude가 직접 개선안 실행
  - `--suggest-print`: Claude 명령어만 출력

- 🛠️ **자동 수정 기능** (`src/fixer/index.ts`):
  - `--fix`: 문제별 수정 제안 (YAML 형식)
  - 수정 후 예상 Determinism Score 표시

- 🎛️ **인터랙티브 모드** (`src/interactive/index.ts`):
  - `--interactive`: 각 문제마다 선택지 제공
  - Claude 제안 받기 옵션

- 📊 **프로젝트 초기화**:
  - `cclint init`: .cclintrc 생성 + pre-commit hook 설치

### Improved

- ⚡ **성능**: 규칙 엔진 최적화
- 🎨 **UX**: 더 친화적인 에러 메시지

---

## [0.2.0] - 2025-12-10

### Added

- 📁 **디렉토리 lint**: `cclint .` 또는 `cclint docs/`로 전체 MD 파일 검사
- 🔧 **설정 파일** (`.cclintrc`):
  - YAML 형식 설정 지원
  - 규칙별 심각도 커스터마이징
  - 커스텀 도메인 정의

- 📋 **규칙 추가**:
  - `unbounded-scope`: "모든 파일" 등 범위 무제한 감지
  - `no-subjective-criterion`: "예쁘게", "우아하게" 등 주관적 기준 감지
  - `vague-quantifier`: "많은", "빠른" 등 모호한 수량 표현 감지
  - `no-rollback-plan`: 삭제/배포 작업에 롤백 계획 없음 감지

### Improved

- 📊 **Determinism Score 모델**: 확률 기반 불확실성 전파 모델 도입
  - `P_deterministic = Π(1 - u_i)`
  - 위반이 누적될수록 점수 급격히 하락

---

## [0.1.0] - 2025-11-15

### Added

- 🎯 **CcLint 초기 출시**
- 📝 **기본 규칙**:
  - `ambiguous-qualifier`: "잘", "적절히" 등 모호한 수식어
  - `missing-constraint`: 도메인별 필수 제약 조건 누락
  - `conflicting-rules`: "간결하게" vs "상세하게" 등 충돌

- 📊 **Determinism Score**: 커맨드 결정론성 수치화 (1-10)

- 🖥️ **CLI 기본 기능**:
  - 단일 커맨드 검증
  - 파일 기반 검사
  - JSON 출력 형식

- 📚 **문서화**:
  - README.md: 개요, 설치, 사용법
  - CONTRIBUTING.md: 기여 가이드

---

## 버전 업그레이드 가이드

### 0.4.0 → 0.5.0

**주요 변경**:
- `CommandSchema` 타입 추가 (선택사항)
- Codification Score 계산 로직 추가
- 새로운 API 문서 추가

**마이그레이션**:
```bash
# 기존 코드는 호환 (breaking change 없음)
npm update @seunggabi/cclint

# 새 기능 활용
cclint --suggest "your command"
```

### 0.3.0 → 0.4.0

**주요 변경**:
- `implicit-assumption` 규칙 추가
- `--watch` 모드 추가

**마이그레이션**:
```bash
npm update @seunggabi/cclint

# 기존 .cclintrc 자동 호환
cclint .  # 이제 watch도 가능
```

---

## 향후 계획 (Roadmap)

### 0.6.0 (계획)
- [ ] 한국어 + 영어 혼합 커맨드 지원 개선
- [ ] GraphQL 스키마 분석 추가
- [ ] REST API 명세 자동 생성

### 0.7.0 (계획)
- [ ] 빅 데이터 파이프라인 도메인 추가
- [ ] 실시간 협업 lint (WebSocket)
- [ ] IDE 플러그인 (VSCode, Neovim)

### 1.0.0 (계획)
- [ ] 안정적인 API 확정
- [ ] 성능 최적화 완료
- [ ] 프로덕션 레디 상태

---

## 기여자

이 프로젝트의 성장에 도움을 주신 모든 분들께 감사합니다!

[GitHub Contributors](https://github.com/seunggabi/cclint/graphs/contributors)

---

## 문제 보고 및 기능 요청

- 🐛 [버그 리포트](https://github.com/seunggabi/cclint/issues/new?template=bug_report.md)
- ✨ [기능 요청](https://github.com/seunggabi/cclint/issues/new?template=feature_request.md)
- 💬 [토론](https://github.com/seunggabi/cclint/discussions)

---

## 라이선스

[MIT](LICENSE) © [seunggabi](https://github.com/seunggabi)
