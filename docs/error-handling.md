# 에러 처리 가이드

## 일반적인 오류와 해결책

### InvalidCommand: 커맨드 파싱 실패

**발생 원인**:
- 커맨드가 너무 복잡하거나 문법이 잘못됨
- 지원하지 않는 형식의 입력

**해결책**:
```bash
# ❌ 나쁜 예: 너무 복잡한 자연어
cclint "이거 저거 그거 다 해줄 수 있어?"

# ✅ 좋은 예: 명확한 동사 + 파라미터
cclint "순환 복잡도를 10 이하로 개선해줄래?"
```

---

### Timeout: API 응답 초과 (30초)

**발생 원인**:
- Claude API 응답 지연
- 네트워크 연결 문제
- 프롬프트가 너무 길어서 처리 시간 초과

**해결책**:

1. **프롬프트 간결화**:
```bash
# ❌ 너무 긴 프롬프트
cclint "모든 파일의 모든 함수의 모든 부분을 성능, 보안, 가독성, 유지보수성, 확장성 모두 개선해줄래?"

# ✅ 간단한 프롬프트
cclint "성능을 50% 개선해줄래?"
```

2. **부분 요청으로 분할**:
```bash
# 먼저 성능만
cclint "성능을 50% 개선해줄래?"

# 그 다음 보안
cclint "보안 취약점을 수정해줄래?"
```

3. **캐싱 활용**:
같은 요청을 반복하는 경우 결과가 캐시됩니다.

---

### InvalidSchema: 스키마 생성 실패

**발생 원인**:
- 파라미터 타입 불일치
- 필수 필드 누락
- 유효하지 않은 열거형 값

**해결책**:

1. **파라미터 형식 확인**:
```bash
# ❌ 잘못된 형식
cclint "응답시간을 개선해줄래?"  # 수치 없음

# ✅ 올바른 형식
cclint "응답시간을 500ms 이하로 개선해줄래?"
```

2. **선택 가능한 값 명시**:
```bash
# ❌ 애매한 표현
cclint "프레임워크로 테스트 작성해줄래?"

# ✅ 명시적 선택
cclint "Jest로 테스트 작성해줄래?"
```

3. **필수 정보 포함**:
```bash
# ❌ 필수 정보 부족
cclint "배포해줄래?"

# ✅ 필수 정보 포함
cclint "production에 blue-green 배포해줄래?"
```

---

### UnknownDomain: 미지원 도메인

**발생 원인**:
- `.cclintrc`에 정의되지 않은 도메인
- 커스텀 도메인이 설정되지 않음

**해결책**:

1. **지원되는 도메인 목록 확인**:
```bash
cclint --help  # 지원되는 도메인 확인
```

2. **커스텀 도메인 추가**:

`.cclintrc` 파일:
```yaml
custom:
  domains:
    api-gateway:
      required: [framework, rate-limit, timeout]
```

사용:
```bash
cclint "API Gateway로 rate-limit 1000/min, timeout 30s로 구성해줄래?"
```

자세한 내용은 [확장 가이드](./extension-guide.md)를 참고하세요.

---

### MissingRequiredParameter: 필수 파라미터 누락

**발생 원인**:
- 도메인에서 요구하는 필수 파라미터가 없음
- Codification Score가 60 이하

**해결책**:

1. **분석 결과 확인**:
```bash
$ cclint --suggest "성능을 개선해줄래?"

codificationScore: 0
issues:
  - parameter: "metric"
    reason: "측정 기준 미지정"
    suggestion: "응답시간(ms), CPU 사용률(%) 등 명시"
  - parameter: "threshold"
    reason: "목표 수치 미지정"
    suggestion: "예: 500ms 이하, 50% 이하"
```

2. **제안된 형식에 따라 수정**:
```bash
# 메시지에 따라 수정
cclint --suggest "응답시간을 500ms 이하로 개선해줄래?"
```

---

### ConflictingConstraints: 상충하는 제약 조건

**발생 원인**:
- 상반된 요구사항 (예: "최대한 빠르고" + "안정성 최우선")
- 불가능한 목표 (예: "코드 길이 10줄" + "80% 커버리지")

**해결책**:

1. **우선순위 명시**:
```bash
# ❌ 상충
cclint "최대한 빠르고 동시에 가장 안정적이게"

# ✅ 우선순위 명시
cclint "응답시간을 500ms 이하로 (안정성은 99.9% 이상)"
```

2. **선택지 제시**:
```bash
# 성능 우선
cclint "성능을 60% 개선해줄래? (코드 가독성은 기본 유지)"

# 안정성 우선
cclint "99.99% 가용성 확보해줄래? (성능은 현재 수준 유지)"
```

---

## 디버깅 팁

### JSON 형식으로 상세 정보 확인

```bash
cclint --json "성능을 개선해줄래?" | jq .
```

### 단계별 분석

```bash
# 1단계: 문제 파악
cclint "성능을 개선해줄래?"

# 2단계: 제안 확인
cclint --suggest-print "성능을 개선해줄래?"

# 3단계: 수정
cclint --fix "성능을 개선해줄래?"

# 4단계: 재확인
cclint "응답시간을 500ms 이하로 개선해줄래?"
```

### .cclintrc 검증

```bash
# 현재 설정 확인
cat .cclintrc

# 커스텀 도메인 확인
cclint init --help
```

---

## 자주 묻는 질문 (FAQ)

### Q: 같은 커맨드를 줘도 매번 다른 Codification Score가 나옵니다.

**A**: Codification Score는 커맨드의 형식에 따라 달라집니다. 커맨드가 일관되게 같아야 점수도 같습니다.

```bash
# 이들은 모두 다른 점수
cclint "성능을 개선해줄래?"
cclint "성능 개선해줄래?"
cclint "성능 개선"
```

---

### Q: 어떻게 Codification Score를 100으로 만들 수 있습니까?

**A**: 도메인의 모든 필수 파라미터를 명확히 정의해야 합니다.

```bash
# 점수: 0 (필수 파라미터 없음)
cclint "성능을 개선해줄래?"

# 점수: 66 (일부만 정의)
cclint "응답시간을 500ms 이하로 개선해줄래?"

# 점수: 100 (모두 정의)
cclint "응답시간을 500ms 이하로, scope는 API 엔드포인트로 개선해줄래?"
```

---

### Q: 외부 API와 통합할 때 네트워크 에러가 발생합니다.

**A**: 프롬프트를 간단히 하거나, 로컬 분석 모드를 사용하세요.

```bash
# 간단한 프롬프트
cclint "Jest로 80% 커버리지로 테스트 작성"

# --suggest 없이 로컬 분석만
cclint "Jest로 80% 커버리지로 테스트 작성"
```

---

## 버그 리포트

문제가 발생하면 다음 정보와 함께 이슈를 등록하세요:

1. CcLint 버전 (`cclint --version`)
2. 입력 커맨드
3. 전체 에러 메시지
4. `.cclintrc` 설정 (해당되는 경우)

```bash
cclint --version
cclint --json "your command" | jq .
```

이 정보를 [GitHub Issues](https://github.com/seunggabi/cclint/issues)에 등록해주세요.
