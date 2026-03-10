# CcLint

**AI 커맨드를 위한 Linter — 모호성을 검출하고 결정론성을 높인다.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/seunggabi/cclint?style=social)](https://github.com/seunggabi/cclint/stargazers)
[![npm](https://img.shields.io/npm/v/%40seunggabi%2Fcclint?color=red)](https://www.npmjs.com/package/@seunggabi/cclint)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)

---

## 왜 CcLint인가?

AI 코딩 에이전트에게 자연어로 지시를 내릴 때, **같은 커맨드를 줘도 매번 다른 결과**가 나온다.

```
f("커밋 메시지 잘 작성해줘") → 실행 1: 영어로 작성
f("커밋 메시지 잘 작성해줘") → 실행 2: 한국어로 작성
f("커밋 메시지 잘 작성해줘") → 실행 3: 본문 없이 제목만
```

같은 입력에 다른 출력 — 이러면 이 위에 더 큰 시스템을 안정적으로 쌓을 수 없다.

**CcLint**는 AI 커맨드의 모호성을 검출하고 결정론성(Determinism)을 높인다.
ESLint가 JS 코드를, Black이 Python 코드를 정리하듯이.

---

## 설치

### npm (권장)

```bash
npm install -g @seunggabi/cclint
```

### npx (설치 없이 바로 사용)

```bash
npx @seunggabi/cclint "커밋 메시지 잘 작성해줘"
```

### curl

```bash
curl -fsSL https://raw.githubusercontent.com/seunggabi/cclint/main/install.sh | bash
```

---

## 빠른 시작

```bash
# 단일 커맨드 검증
cclint "커밋 메시지 잘 작성해줘"

# 자동 수정 제안
cclint --fix "테스트 코드 작성해줘"

# 현재 디렉토리 .md 파일 전체 lint (CLAUDE.md, AGENTS.md 등)
cclint .

# 특정 파일 lint
cclint CLAUDE.md

# 파일 감시 모드 — 저장 시 자동 re-lint
cclint --watch .

# 인터랙티브 모드 — 문제마다 선택지 제공
cclint --interactive "모든 파일 정리해줘"

# Claude AI 개선안 출력
cclint --suggest-print "커밋 메시지 잘 작성해줘"

# 프로젝트 초기화 (.cclintrc 생성 + pre-commit hook)
cclint init
```

---

## 동작 예시

### 기본 lint

```bash
$ cclint "커밋 메시지 잘 작성해줘"

────────────────────────────────────────────────────────────
CcLint v0.3.0
────────────────────────────────────────────────────────────
입력: "커밋 메시지 잘 작성해줘"

❌  "잘" — 정량 기준 없음  (ambiguous-qualifier)
     → "잘"는 해석이 실행마다 달라질 수 있습니다.
⚠️   language 미지정  (missing-constraint)
⚠️   format 미지정  (missing-constraint)
⚠️   max-length 미지정  (missing-constraint)

Determinism Score: 4/10 🔴 — 매번 다른 결과
```

### --fix 자동 수정

```bash
$ cclint --fix "커밋 메시지 잘 작성해줘"

# ... lint 결과 ...

자동 수정 제안 (--fix)
────────────────────────────────────────────────────────────
→ commit:
    language: ko
    format: conventional-commits
    max-length: '72'

수정 후 예상 Score: 10/10
```

### --interactive 선택지 모드

```bash
$ cclint --interactive "커밋 메시지 잘 작성해줘"

⚠️ language 미지정
  1) ko (한국어)
  2) en (영어)
  3) Claude에게 제안 받기 (claude -p)
  4) 직접 입력
선택 (1-4): 1
```

### .md 파일 전체 lint

```bash
$ cclint .

CcLint v0.3.0
디렉토리: /your/project
대상 파일: 3개 (*.md)

CLAUDE.md
  L3: ❌ ambiguous-qualifier: "깔끔하게" — 정량 기준 없음
  L7: ❌ conflicting-rules: "간결하게" vs "상세하게" — 규칙 충돌
  L12: ⚠️  missing-constraint: format 미지정

✖ 2 error, 1 warning (3개 파일 검사)
```

---

## Determinism Score

| 점수 | 의미 | 상태 |
|------|------|------|
| 9-10 | 거의 순수 함수 수준 | 🟢 매번 같은 결과 |
| 7-8  | 대부분 예측 가능 | 🟡 minor 차이만 |
| 5-6  | 결과가 상당히 달라질 수 있음 | 🟠 |
| 3-4  | 매번 다른 결과 | 🔴 |
| 1-2  | 랜덤에 가까움 | ⛔ |

Score는 **확률 기반 불확실성 전파 모델**로 계산됩니다:

```
P_deterministic = Π(1 - u_i)
Score = 10 × P_deterministic
```

각 규칙 위반은 독립 사건으로, 위반이 누적될수록 Score가 급격히 하락합니다.

---

## 규칙 (Rules)

| Rule ID | 설명 | 기본값 |
|---------|------|--------|
| `ambiguous-qualifier` | "잘", "적절히" 등 모호한 수식어 | error |
| `missing-constraint` | 도메인별 필수 제약 조건 누락 | warn |
| `conflicting-rules` | "간결하게" vs "상세하게" 등 충돌 | error |
| `implicit-assumption` | "기존처럼", "알아서" 등 암묵적 전제 | warn |
| `unbounded-scope` | "모든 파일" 등 범위 무제한 | warn |
| `no-subjective-criterion` | "예쁘게", "우아하게" 등 주관적 기준 | warn |
| `vague-quantifier` | "많은", "빠른" 등 모호한 수량 표현 | warn |
| `no-rollback-plan` | 삭제/배포 작업에 롤백 계획 없음 | warn |

---

## 설정 (.cclintrc)

프로젝트 루트에 `.cclintrc` 파일을 만들면 규칙을 커스텀할 수 있습니다.

```yaml
rules:
  ambiguous-qualifier: error     # error | warn | off
  missing-constraint: warn
  conflicting-rules: error
  implicit-assumption: warn
  unbounded-scope: warn
  no-subjective-criterion: warn
  vague-quantifier: warn
  no-rollback-plan: warn

custom:
  language: ko                   # 이 언어는 missing-constraint에서 제외
  domains:
    deploy:
      required: [environment, strategy, rollback-plan]
```

우선순위: `./cclintrc` > `./.cclintrc` > `~/.cclintrc`

---

## Codification Analysis (Beta)

AI 커맨드를 구조화된 JSON Schema로 변환하고, 각 파라미터의 명확성을 분석합니다.

```bash
# 명확성 분석 (구조화 점수)
cclint --suggest "성능을 개선해줄래?"

# 출력 (JSON)
{
  "codificationScore": 40,
  "analysis": {
    "codifiedCount": 0,
    "undefinedCount": 3,
    "issues": [
      {
        "parameter": "metric",
        "reason": "측정 기준 미지정",
        "suggestion": "응답시간, CPU 사용률, 메모리 등 구체적 지표 명시"
      }
    ]
  }
}
```

**Codification Score란?**
- **0-30**: 매우 모호 (거의 모든 파라미터 미정의)
- **31-60**: 부분 명확 (일부 파라미터만 정의됨)
- **61-100**: 완전 명확 (모든 필수 파라미터 정의됨)

예제:

**예제 1: 성능 (완전 모호)**
```bash
$ cclint "성능을 개선해줄래?"

⚠️   "성능을 개선해줄래?" — 성능 개선의 정량화 실패
     → 구체적 목표(응답시간 <100ms, 처리량 >1000 req/s 등)를 명시하세요

Determinism Score: 9/10 🟢 — 거의 순수 함수 수준
```

**예제 2: 성능 (부분 명확)**
```bash
$ cclint "응답시간을 500ms 이하로 개선해줄래?"

✔ 문제 없음

Determinism Score: 9/10 🟢 — 거의 순수 함수 수준
```

**예제 3: 코드 품질 (완전 명확)**
```bash
$ cclint "순환 복잡도를 10 이하로, ESLint 0 errors로"

✔ 문제 없음

Determinism Score: 10/10 🟢 — 거의 순수 함수 수준
```

**예제 4: 리팩토링 (모호성 있음)**
```bash
$ cclint "깔끔한 코드로 리팩토링해줄래?"

⚠️   language 미지정
     → 출력 언어를 명시하세요
⚠️   style 미지정
     → 코드 스타일을 명시하세요
⚠️   "깔끔한 코드로" — 정성적 목표의 정량화 실패

Determinism Score: 6.5/10 🟠 — 결과가 상당히 달라질 수 있음
```

**예제 5: 테스트 (명확함)**
```bash
$ cclint "Jest로 80% 커버리지로 src/**/*.ts 대상으로 테스트 작성"

✔ 문제 없음

Determinism Score: 10/10 🟢 — 거의 순수 함수 수준
```

자세한 내용은 [Codification Analysis API](docs/codification-api.md)를 참고하세요.

---

## Claude AI 통합

`--suggest-print` 플래그로 Claude에게 개선안을 요청하는 명령어를 출력합니다:

```bash
$ cclint --suggest-print "테스트 코드 작성해줘"

claude -p '다음 AI 커맨드에서 아래 문제들이 감지되었습니다.
원본 커맨드: "테스트 코드 작성해줘"
감지된 문제:
- framework 미지정 (missing-constraint)
- coverage 미지정 (missing-constraint)
...'
```

`claude` CLI가 설치된 경우 `--suggest`로 직접 실행할 수도 있습니다.

---

## CLI 옵션

```
cclint [target] [options]

Arguments:
  target          커맨드 문자열, 파일 경로, 또는 디렉토리 (기본: 현재 디렉토리)

Options:
  -f, --fix           자동 수정 제안 생성
  -i, --interactive   문제마다 선택지를 제공하는 인터랙티브 모드
  -s, --suggest       claude -p 로 AI 개선안 실행
  --suggest-print     claude -p 명령어 출력 (실행 안 함)
  -w, --watch         파일 변경 감시 후 자동 re-lint
  --json              JSON 형식으로 출력
  --ext <exts>        lint 대상 확장자 (기본: md)
  -V, --version       버전 출력
  -h, --help          도움말

Commands:
  init [--force]      .cclintrc 생성 + pre-commit hook 설치
```

---

## 왜 중요한가

AI 에이전트가 **파이프라인의 한 단계**로 쓰이는 시대에, 각 단계의 커맨드가 불순 함수이면 오류가 곱셈으로 전파됩니다:

```
불확실성 0.7 × 0.7 × 0.7 = 0.343
```

커맨드의 결정론성을 높이는 것은 **AI 기반 소프트웨어 엔지니어링의 신뢰성 기반**을 만드는 일입니다.

---

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

```bash
git clone https://github.com/seunggabi/cclint.git
cd cclint
npm install
npm run build
```

---

## License

[MIT](LICENSE) © [seunggabi](https://github.com/seunggabi)
