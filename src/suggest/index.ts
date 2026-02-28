import { execSync } from 'child_process';
import type { LintResult } from '../types.js';

// ─── claude -p 를 통한 AI 제안 ───────────────────────────────────────────────

export interface ClaudeSuggestion {
  improvedCommand: string;
  explanation: string;
  raw: string;
}

function buildClaudePrompt(command: string, result: LintResult): string {
  const issues = result.messages
    .map(m => `- ${m.message} (${m.ruleId})`)
    .join('\n');

  return `다음 AI 커맨드에서 아래 문제들이 감지되었습니다.

원본 커맨드: "${command}"

감지된 문제:
${issues}

위 문제를 해결하여 더 결정론적(deterministic)인 커맨드로 개선해주세요.

응답 형식:
개선된 커맨드: <개선된 커맨드 한 줄>
설명: <무엇을 어떻게 개선했는지 1-2줄>`;
}

export function runClaudeSuggest(command: string, result: LintResult): ClaudeSuggestion | null {
  const prompt = buildClaudePrompt(command, result);

  try {
    // claude -p "prompt" 실행
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const raw = execSync(`claude -p "${escaped}" 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 30000,
    }).trim();

    return parseClaudeOutput(raw);
  } catch {
    return null;
  }
}

function parseClaudeOutput(raw: string): ClaudeSuggestion {
  const commandMatch = raw.match(/개선된 커맨드:\s*(.+)/);
  const explanationMatch = raw.match(/설명:\s*(.+)/s);

  return {
    improvedCommand: commandMatch?.[1]?.trim() ?? raw.split('\n')[0],
    explanation: explanationMatch?.[1]?.trim() ?? '',
    raw,
  };
}

// ─── claude -p 프롬프트 출력 (실행 없이 출력만) ─────────────────────────────

export function printClaudeCommand(command: string, result: LintResult): void {
  const prompt = buildClaudePrompt(command, result);
  const escaped = prompt.replace(/'/g, "'\\''");
  console.log('\n─────────────────────────────────────────');
  console.log('💡 Claude 제안 명령어 (복사해서 실행):');
  console.log('─────────────────────────────────────────');
  console.log(`\nclaude -p '${escaped}'\n`);
}
