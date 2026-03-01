#!/usr/bin/env bash
# CcLint — AI 커맨드 Linter (standalone shell script)
# 사용법:
#   ./cclint.sh "커밋 메시지 잘 작성해줘"
#   ./cclint.sh --fix "테스트 코드 작성해줘"
#   ./cclint.sh --interactive "모든 파일 정리해줘"
#   ./cclint.sh --suggest "커밋 메시지 잘 작성해줘"
#   ./cclint.sh --suggest-print "커밋 메시지 잘 작성해줘"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# dist 빌드 확인
if [ ! -f "$SCRIPT_DIR/dist/cli/index.js" ]; then
  echo "⚙️  빌드 중..."
  cd "$SCRIPT_DIR" && npm run build 2>&1
fi

node "$SCRIPT_DIR/dist/cli/index.js" "$@"
