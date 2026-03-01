import * as readline from 'readline';
import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import type { CcLintConfig, RuleConfig, RuleId } from '../types.js';

// ─── 인터랙티브 init ──────────────────────────────────────────────────────────

interface InitOptions {
  force?: boolean;
}

async function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

export async function runInit(opts: InitOptions = {}): Promise<void> {
  const rcPath = resolve('.cclintrc');

  if (existsSync(rcPath) && !opts.force) {
    console.log(`⚠️  .cclintrc 파일이 이미 존재합니다. 덮어쓰려면 --force 플래그를 사용하세요.`);
    return;
  }

  console.log('\n🔧 CcLint 프로젝트 초기화\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // 언어 선택
  console.log('기본 출력 언어:');
  console.log('  1) ko (한국어)');
  console.log('  2) en (영어)');
  const langAnswer = await ask(rl, '선택 (1-2) [1]: ');
  const language = langAnswer.trim() === '2' ? 'en' : 'ko';

  // 엄격도 선택
  console.log('\nLint 엄격도:');
  console.log('  1) strict  — 모든 규칙 error');
  console.log('  2) standard — 기본값 (권장)');
  console.log('  3) relaxed — warning만');
  const strictAnswer = await ask(rl, '선택 (1-3) [2]: ');

  // pre-commit hook 설치 여부
  const hookAnswer = await ask(rl, '\npre-commit hook 설치? (git commit 전 자동 lint) [Y/n]: ');
  const installHook = hookAnswer.trim().toLowerCase() !== 'n';

  rl.close();

  // config 생성
  const config = buildConfig(strictAnswer.trim(), language);
  const configYaml = yaml.dump(config, { indent: 2 });

  writeFileSync(rcPath, `# CcLint Configuration\n# https://github.com/seunggabi/cclint\n\n${configYaml}`);
  console.log(`\n✅ .cclintrc 생성 완료`);

  // pre-commit hook 설치
  if (installHook) {
    installPreCommitHook();
  }

  console.log('\n시작하기:');
  console.log('  cclint .                     # 현재 디렉토리 lint');
  console.log('  cclint "커밋 메시지 잘 써줘"  # 단일 커맨드 lint');
  console.log('  cclint --watch .             # 파일 감시 모드');
}

function buildConfig(strictLevel: string, language: string): Omit<CcLintConfig, 'custom'> & { custom: { language: string } } {
  const ruleIds: RuleId[] = [
    'ambiguous-qualifier', 'missing-constraint', 'conflicting-rules',
    'implicit-assumption', 'unbounded-scope', 'no-subjective-criterion',
    'vague-quantifier', 'no-rollback-plan',
  ];

  let rules: Partial<Record<RuleId, RuleConfig>>;

  if (strictLevel === '1') {
    // strict: 모두 error
    rules = Object.fromEntries(ruleIds.map(id => [id, 'error'])) as Record<RuleId, RuleConfig>;
  } else if (strictLevel === '3') {
    // relaxed: 모두 warn
    rules = Object.fromEntries(ruleIds.map(id => [id, 'warn'])) as Record<RuleId, RuleConfig>;
  } else {
    // standard (기본값)
    rules = {
      'ambiguous-qualifier': 'error',
      'missing-constraint': 'warn',
      'conflicting-rules': 'error',
      'implicit-assumption': 'warn',
      'unbounded-scope': 'warn',
      'no-subjective-criterion': 'warn',
      'vague-quantifier': 'warn',
      'no-rollback-plan': 'warn',
    };
  }

  return { rules, custom: { language } };
}

function installPreCommitHook(): void {
  const hookPath = resolve('.git/hooks/pre-commit');

  if (!existsSync(resolve('.git'))) {
    console.log('⚠️  .git 디렉토리가 없습니다. git init 후 다시 시도하세요.');
    return;
  }

  const hookContent = `#!/usr/bin/env bash
# CcLint pre-commit hook
# https://github.com/seunggabi/cclint

if command -v cclint &>/dev/null; then
  cclint . --ext md
  if [ $? -ne 0 ]; then
    echo ""
    echo "❌ CcLint: 모호한 커맨드가 감지되었습니다."
    echo "   cclint --fix . 로 자동 수정하거나 직접 수정 후 커밋하세요."
    exit 1
  fi
fi
`;

  writeFileSync(hookPath, hookContent, { mode: 0o755 });
  console.log(`✅ pre-commit hook 설치 완료 (.git/hooks/pre-commit)`);
}
