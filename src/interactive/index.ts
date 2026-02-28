import * as readline from 'readline';
import type { LintResult, LintMessage, FixSuggestion } from '../types.js';

// ─── 선택지 옵션 ─────────────────────────────────────────────────────────────

export interface Choice {
  label: string;
  value: string;
}

// 규칙별 선택지 생성
export function buildChoices(msg: LintMessage): Choice[] {
  switch (msg.ruleId) {
    case 'ambiguous-qualifier':
      return [
        { label: 'auto-fix (기본값 자동 적용)', value: 'auto' },
        { label: 'Claude에게 제안 받기 (claude -p)', value: 'claude' },
        { label: '직접 입력', value: 'manual' },
      ];

    case 'missing-constraint': {
      const constraint = msg.message.replace(' 미지정', '').trim();
      const presets = CONSTRAINT_PRESETS[constraint] ?? [];
      return [
        ...presets.map(p => ({ label: p, value: p })),
        { label: 'Claude에게 제안 받기 (claude -p)', value: 'claude' },
        { label: '직접 입력', value: 'manual' },
      ];
    }

    case 'conflicting-rules':
      return [
        { label: 'Claude에게 제안 받기 (claude -p)', value: 'claude' },
        { label: '직접 수정하겠습니다', value: 'skip' },
      ];

    default:
      return [
        { label: 'auto-fix', value: 'auto' },
        { label: 'Claude에게 제안 받기 (claude -p)', value: 'claude' },
        { label: '건너뛰기', value: 'skip' },
      ];
  }
}

const CONSTRAINT_PRESETS: Record<string, string[]> = {
  language: ['ko (한국어)', 'en (영어)', 'ja (일본어)'],
  format: ['conventional-commits', 'gitmoji', 'markdown', 'plain'],
  'max-length': ['50자', '72자', '100자'],
  framework: ['jest', 'vitest', 'mocha', 'pytest'],
  coverage: ['70%', '80%', '90%'],
  environment: ['production', 'staging', 'development'],
};

// ─── 인터랙티브 프롬프트 ─────────────────────────────────────────────────────

export async function promptChoice(
  msg: LintMessage,
  choices: Choice[]
): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const icon = msg.severity === 'error' ? '❌' : '⚠️ ';
  console.log(`\n${icon} ${msg.message}`);
  if (msg.detail) console.log(`   ${msg.detail}`);
  console.log('');

  choices.forEach((c, i) => {
    console.log(`  ${i + 1}) ${c.label}`);
  });

  return new Promise(resolve => {
    rl.question(`\n선택 (1-${choices.length}): `, answer => {
      rl.close();
      const idx = parseInt(answer.trim(), 10) - 1;
      if (idx >= 0 && idx < choices.length) {
        resolve(choices[idx].value);
      } else {
        resolve('skip');
      }
    });
  });
}

export async function promptManualInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${prompt}: `, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── 인터랙티브 세션 실행 ────────────────────────────────────────────────────

export interface InteractiveResult {
  resolutions: Record<string, string>;
  requestClaude: boolean;
}

export async function runInteractive(
  result: LintResult,
  fix: FixSuggestion | null | undefined
): Promise<InteractiveResult> {
  const resolutions: Record<string, string> = {};
  let requestClaude = false;

  if (result.messages.length === 0) {
    console.log('\n✔ 문제 없음 — 인터랙티브 수정이 필요하지 않습니다.');
    return { resolutions, requestClaude };
  }

  console.log('\n─────────────────────────────────────────');
  console.log('🔧 인터랙티브 수정 모드');
  console.log('─────────────────────────────────────────');
  console.log(`${result.messages.length}개 문제를 하나씩 해결합니다.\n`);

  for (const msg of result.messages) {
    const choices = buildChoices(msg);
    const selected = await promptChoice(msg, choices);

    if (selected === 'claude') {
      requestClaude = true;
    } else if (selected === 'manual') {
      const input = await promptManualInput('값 입력');
      resolutions[msg.ruleId] = input;
    } else if (selected === 'auto') {
      // auto-fix 값은 fixer에서 이미 생성됨
      resolutions[msg.ruleId] = 'auto';
    } else if (selected !== 'skip') {
      resolutions[msg.ruleId] = selected;
    }
  }

  return { resolutions, requestClaude };
}
