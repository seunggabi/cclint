#!/usr/bin/env node
// CommandLint — AI 커맨드 Linter (standalone JS runner)
// 사용법:
//   node commandlint.js "커밋 메시지 잘 작성해줘"
//   node commandlint.js --fix "테스트 코드 작성해줘"
//   node commandlint.js --interactive "모든 파일 정리해줘"
//   node commandlint.js --suggest-print "커밋 메시지 잘 작성해줘"

import { spawnSync, execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, 'dist/cli/index.js');

// 빌드 확인
if (!existsSync(cliPath)) {
  console.log('⚙️  빌드 중...');
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
}

const result = spawnSync('node', [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: __dirname,
});

process.exit(result.status ?? 0);
