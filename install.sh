#!/usr/bin/env bash
# CcLint installer
# Usage: curl -fsSL https://raw.githubusercontent.com/seunggabi/cclint/main/install.sh | bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info()  { echo -e "${GREEN}$1${NC}"; }
print_warn()  { echo -e "${YELLOW}$1${NC}"; }
print_error() { echo -e "${RED}$1${NC}"; }

# Node.js 확인
if ! command -v node &>/dev/null; then
  print_error "Node.js가 필요합니다. https://nodejs.org 에서 설치하세요."
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  print_error "Node.js 18 이상이 필요합니다. 현재: $(node --version)"
  exit 1
fi

print_info "CcLint 설치 중..."

npm install -g cclint

print_info "✅ CcLint 설치 완료!"
echo ""
echo "사용법:"
echo '  cclint "커밋 메시지 잘 작성해줘"'
echo '  cclint --fix "테스트 코드 작성해줘"'
echo "  cclint .                           # 현재 디렉토리 .md 파일 lint"
echo ""
echo "자세한 내용: https://github.com/seunggabi/cclint"
