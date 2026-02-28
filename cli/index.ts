#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { resolve, join, relative } from 'path';
import { lint, lintWithFix, DEFAULT_CONFIG, loadConfig } from '../src/index.js';
import { runInteractive } from '../src/interactive/index.js';
import { runClaudeSuggest, printClaudeCommand } from '../src/suggest/index.js';
import type { LintResult, FixSuggestion, CommandLintConfig } from '../src/index.js';

const program = new Command();

program
  .name('commandlint')
  .description('AI 커맨드를 위한 Linter — 모호성을 검출하고 결정론성을 높인다')
  .version('0.1.0');

// ─── commandlint [command|path] ───────────────────────────────────────────────

program
  .argument('[target]', '커맨드 문자열, 파일, 또는 디렉토리 (기본: 현재 디렉토리)')
  .option('-f, --fix', '자동 수정 제안 생성')
  .option('-i, --interactive', '문제마다 선택지를 제공하는 인터랙티브 모드')
  .option('-s, --suggest', 'claude -p 로 AI 개선안 실행 (claude CLI 필요)')
  .option('--suggest-print', 'claude -p 명령어를 출력만 (실행 안 함)')
  .option('--json', 'JSON 형식으로 출력')
  .option('--ext <exts>', 'lint 대상 확장자 (기본: md)', 'md')
  .action(async (
    target: string | undefined,
    opts: {
      fix: boolean;
      interactive: boolean;
      suggest: boolean;
      suggestPrint: boolean;
      json: boolean;
      ext: string;
    }
  ) => {
    const exts = opts.ext.split(',').map(e => e.trim().replace(/^\./, ''));

    // .commandlintrc 자동 로드
    const config = loadConfig();

    // ── 디렉토리 or '.' → md 파일 재귀 lint ──────────────────────────────
    if (!target || target === '.' || isDirectory(target)) {
      const dir = resolve(target ?? '.');
      await lintDirectory(dir, exts, opts, config);
      return;
    }

    // ── 파일 경로 → 파일 lint ─────────────────────────────────────────────
    if (isFile(target)) {
      await lintFile(target, opts, config);
      return;
    }

    // ── 커맨드 문자열 lint ────────────────────────────────────────────────
    const input = target;
    const output = lintWithFix(input, config);
    const { result, fix } = output;

    if (opts.json) { console.log(JSON.stringify(output, null, 2)); return; }

    printResult(result);

    if (opts.fix && fix) printFix(fix);

    if (opts.interactive && result.messages.length > 0) {
      const { requestClaude } = await runInteractive(result, fix);
      if (requestClaude) await handleClaudeSuggest(input, result, opts.suggest);
      else if (fix) {
        console.log('\n' + chalk.dim('─'.repeat(50)));
        console.log(chalk.bold.cyan('적용될 수정:'));
        console.log(chalk.green('→ ') + yaml.dump(fix.yaml, { indent: 2 }).trimEnd());
      }
    }

    if (opts.suggest && !opts.interactive && result.messages.length > 0) {
      await handleClaudeSuggest(input, result, true);
    }

    if (opts.suggestPrint && result.messages.length > 0) {
      printClaudeCommand(input, result);
    }

    if (result.errorCount > 0) process.exit(1);
  });

// ─── 디렉토리 lint ────────────────────────────────────────────────────────────

async function lintDirectory(
  dir: string,
  exts: string[],
  opts: { fix: boolean; suggestPrint: boolean },
  config: CommandLintConfig = DEFAULT_CONFIG
): Promise<void> {
  const mdFiles = collectFiles(dir, exts);

  if (mdFiles.length === 0) {
    console.log(chalk.yellow(`⚠️  .${exts.join(', .')} 파일을 찾을 수 없음: ${dir}`));
    return;
  }

  console.log('');
  console.log(chalk.bold('CommandLint') + chalk.dim(' v0.1.0'));
  console.log(chalk.dim(`디렉토리: ${dir}`));
  console.log(chalk.dim(`대상 파일: ${mdFiles.length}개 (*.${exts.join(', *.')})`));
  console.log('');

  let totalErrors = 0;
  let totalWarns = 0;
  let totalFiles = 0;

  for (const file of mdFiles) {
    const relPath = relative(dir, file);
    const fileResult = lintMarkdownFile(file, config);

    if (fileResult.length === 0) continue;

    totalFiles++;
    console.log(chalk.bold.underline(relPath));

    for (const { lineNum, result, fix } of fileResult) {
      for (const msg of result.messages) {
        const icon = msg.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️ ');
        console.log(
          `${chalk.dim(`  L${lineNum}: `)}${icon} ${chalk.bold(msg.ruleId)}: ${msg.message}`
        );
        if (msg.detail) console.log(chalk.dim(`         → ${msg.detail}`));
      }

      if (opts.fix && fix) {
        console.log(chalk.dim(`         fix → `) + chalk.cyan(yaml.dump(fix.yaml, { indent: 2 }).split('\n')[0]));
      }

      if (opts.suggestPrint && result.messages.length > 0) {
        printClaudeCommand(result.command, result);
      }

      totalErrors += result.errorCount;
      totalWarns += result.warnCount;
    }

    console.log('');
  }

  // ── 요약 ──────────────────────────────────────────────────────────────
  const errTxt = totalErrors > 0 ? chalk.red(`${totalErrors} error`) : `${totalErrors} error`;
  const warnTxt = totalWarns > 0 ? chalk.yellow(`${totalWarns} warning`) : `${totalWarns} warning`;
  console.log(`${totalFiles > 0 ? '✖' : '✔'} ${errTxt}, ${warnTxt} (${mdFiles.length}개 파일 검사)`);

  if (totalErrors > 0) process.exit(1);
}

// ─── MD 파일에서 AI 커맨드 추출 후 lint ──────────────────────────────────────

interface FileLineResult {
  lineNum: number;
  line: string;
  result: LintResult;
  fix: FixSuggestion | null | undefined;
}

function lintMarkdownFile(filePath: string, config: CommandLintConfig = DEFAULT_CONFIG): FileLineResult[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: FileLineResult[] = [];
  let inCodeBlock = false;

  lines.forEach((line, idx) => {
    // 코드블록 안은 건너뜀
    if (line.trim().startsWith('```')) { inCodeBlock = !inCodeBlock; return; }
    if (inCodeBlock) return;

    // 헤더, 빈줄, HTML 주석 건너뜀
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('<!--')) return;

    // AI 커맨드로 보이는 라인만 lint
    // 패턴: 한국어 동사형 / 영어 imperative / 규칙 문장
    if (!isCommandLike(trimmed)) return;

    const output = lintWithFix(trimmed, config);
    if (output.result.messages.length === 0) return;

    results.push({
      lineNum: idx + 1,
      line: trimmed,
      result: output.result,
      fix: output.fix,
    });
  });

  return results;
}

function isCommandLike(line: string): boolean {
  // 한국어 동사형 종결어미
  if (/해줘|해주세요|하세요|해줄|해야|해라|할 것|하시오/.test(line)) return true;
  // 영어 imperative (동사로 시작)
  if (/^(write|create|implement|add|fix|delete|refactor|test|commit|deploy|run|make|ensure|always|never)\b/i.test(line)) return true;
  // "~을/를 작성", "~을/를 사용" 등 명사+동사 패턴
  if (/[을를]\s*(작성|사용|생성|구현|추가|삭제|수정|정리|검토)/.test(line)) return true;
  // 규칙 형태 ("반드시", "절대", "항상")
  if (/반드시|절대|항상|모든|전체/.test(line)) return true;
  return false;
}

// ─── 단일 파일 lint ───────────────────────────────────────────────────────────

async function lintFile(filePath: string, opts: { fix: boolean; suggestPrint: boolean }, config: CommandLintConfig = DEFAULT_CONFIG): Promise<void> {
  console.log(chalk.bold.underline(filePath));
  const results = lintMarkdownFile(filePath, config);

  if (results.length === 0) {
    console.log(chalk.green('\n✔ 문제 없음'));
    return;
  }

  let totalErrors = 0;
  let totalWarns = 0;

  for (const { lineNum, result, fix } of results) {
    for (const msg of result.messages) {
      const icon = msg.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️ ');
      console.log(`${chalk.dim(`  L${lineNum}: `)}${icon} ${chalk.bold(msg.ruleId)}: ${msg.message}`);
      if (msg.detail) console.log(chalk.dim(`         → ${msg.detail}`));
    }
    if (opts.fix && fix) {
      console.log(chalk.dim('         fix → ') + chalk.cyan(yaml.dump(fix.yaml, { indent: 2 }).split('\n')[0]));
    }
    if (opts.suggestPrint && result.messages.length > 0) printClaudeCommand(result.command, result);
    totalErrors += result.errorCount;
    totalWarns += result.warnCount;
  }

  console.log('');
  console.log(`✖ ${totalErrors > 0 ? chalk.red(`${totalErrors} error`) : `${totalErrors} error`}, ${totalWarns > 0 ? chalk.yellow(`${totalWarns} warning`) : `${totalWarns} warning`}`);
  if (totalErrors > 0) process.exit(1);
}

// ─── 파일 시스템 유틸 ────────────────────────────────────────────────────────

function isDirectory(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function isFile(p: string): boolean {
  try { return statSync(p).isFile(); } catch { return false; }
}

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '__pycache__', '.venv']);

function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  function walk(current: string): void {
    let entries: string[];
    try { entries = readdirSync(current); } catch { return; }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry)) continue;
      const full = join(current, entry);
      if (isDirectory(full)) { walk(full); continue; }
      if (exts.some(ext => entry.toLowerCase().endsWith(`.${ext}`))) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

// ─── 출력 헬퍼 ────────────────────────────────────────────────────────────────

async function handleClaudeSuggest(input: string, result: LintResult, execute: boolean): Promise<void> {
  if (execute) {
    console.log('\n' + chalk.dim('─'.repeat(50)));
    console.log(chalk.bold.magenta('🤖 Claude 제안 생성 중...'));
    const suggestion = runClaudeSuggest(input, result);
    if (suggestion) {
      console.log(chalk.green('\n개선된 커맨드:'));
      console.log(chalk.bold(`"${suggestion.improvedCommand}"`));
      if (suggestion.explanation) console.log(chalk.dim(`\n설명: ${suggestion.explanation}`));
    } else {
      console.log(chalk.yellow('claude CLI를 찾을 수 없습니다. --suggest-print 로 명령어를 확인하세요.'));
      printClaudeCommand(input, result);
    }
  } else {
    printClaudeCommand(input, result);
  }
}

function printResult(result: LintResult): void {
  console.log('');
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.bold('CommandLint') + chalk.dim(' v0.1.0'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.dim('입력: ') + chalk.italic(`"${result.command}"`));
  console.log('');

  if (result.messages.length === 0) {
    console.log(chalk.green('✔ 문제 없음'));
  } else {
    for (const msg of result.messages) {
      const icon = msg.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️ ');
      console.log(`${icon}  ${msg.message}  ${chalk.dim(`(${msg.ruleId})`)}`);
      if (msg.detail) console.log(chalk.dim(`     → ${msg.detail}`));
    }
  }

  console.log('');
  const scoreColor =
    result.score >= 9 ? chalk.green :
    result.score >= 7 ? chalk.yellow :
    result.score >= 5 ? chalk.hex('#FFA500') :
    chalk.red;
  console.log(
    `Determinism Score: ${scoreColor.bold(`${result.score}/10`)} ${result.scoreEmoji}` +
    chalk.dim(` — ${result.scoreLabel}`)
  );
  console.log('');
}

function printFix(fix: FixSuggestion): void {
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.bold.cyan('자동 수정 제안 (--fix)'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log('');
  console.log(chalk.green('→ ') + yaml.dump(fix.yaml, { indent: 2 }).trimEnd());
  console.log('');
  console.log(chalk.dim('수정 후 예상 Score: ') + chalk.green.bold(`${fix.scoreAfterFix}/10`));
  console.log('');
}

program.parse();
