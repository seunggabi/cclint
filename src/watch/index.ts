import chokidar from 'chokidar';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _pkg = JSON.parse(readFileSync(resolve(__dirname, '../../../package.json'), 'utf-8')) as { version: string };
const VERSION = `v${_pkg.version}`;
import { lintWithFix } from '../index.js';
import type { CcLintConfig, LintResult, FixSuggestion } from '../types.js';

// ─── Watch 모드 ───────────────────────────────────────────────────────────────

export interface WatchOptions {
  exts: string[];
  config: CcLintConfig;
  fix: boolean;
}

interface FileLineResult {
  lineNum: number;
  result: LintResult;
  fix: FixSuggestion | null | undefined;
}

export function runWatch(dir: string, opts: WatchOptions): void {
  const absDir = resolve(dir);
  const patterns = opts.exts.map(ext => `${absDir}/**/*.${ext}`);

  console.log('');
  console.log(chalk.bold('CcLint') + chalk.dim(` ${VERSION} — watch mode`));
  console.log(chalk.dim(`감시 중: ${absDir} (*.${opts.exts.join(', *.')})`));
  console.log(chalk.dim('파일이 저장되면 자동으로 lint합니다. Ctrl+C로 종료.\n'));

  const watcher = chokidar.watch(patterns, {
    ignored: /(node_modules|\.git|dist)/,
    persistent: true,
    ignoreInitial: false,
  });

  watcher
    .on('add',    (fp) => lintFile(fp, absDir, opts, '추가'))
    .on('change', (fp) => lintFile(fp, absDir, opts, '변경'))
    .on('error',  (err) => console.error(chalk.red(`감시 오류: ${err}`)));

  process.on('SIGINT', () => {
    console.log(chalk.dim('\n\nwatch 모드 종료.'));
    watcher.close().then(() => process.exit(0));
  });
}

function lintFile(filePath: string, baseDir: string, opts: WatchOptions, event: string): void {
  const relPath   = relative(baseDir, filePath);
  const timestamp = new Date().toLocaleTimeString('ko-KR');

  console.log(chalk.dim(`\n[${timestamp}] ${event}: ${relPath}`));
  console.log(chalk.dim('─'.repeat(50)));

  const results = lintMarkdownFile(filePath, opts.config);

  if (results.length === 0) {
    console.log(chalk.green('✔ 문제 없음'));
    return;
  }

  let errors = 0;
  let warns  = 0;

  for (const { lineNum, result, fix } of results) {
    for (const msg of result.messages) {
      const icon = msg.severity === 'error' ? chalk.red('❌') : chalk.yellow('⚠️ ');
      console.log(`${chalk.dim(`L${lineNum}:`)} ${icon} ${chalk.bold(msg.ruleId)}: ${msg.message}`);
      if (msg.detail) console.log(chalk.dim(`      → ${msg.detail}`));
    }
    if (opts.fix && fix) {
      console.log(chalk.cyan('  fix → ') + yaml.dump(fix.yaml, { indent: 2 }).split('\n')[0]);
    }
    errors += result.errorCount;
    warns  += result.warnCount;
  }

  const errTxt  = errors > 0 ? chalk.red(`${errors} error`)    : `${errors} error`;
  const warnTxt = warns  > 0 ? chalk.yellow(`${warns} warning`) : `${warns} warning`;
  console.log(`\n✖ ${errTxt}, ${warnTxt}`);
}

function lintMarkdownFile(filePath: string, config: CcLintConfig): FileLineResult[] {
  let content: string;
  try { content = readFileSync(filePath, 'utf-8'); } catch { return []; }

  const lines   = content.split('\n');
  const results: FileLineResult[] = [];
  let inCodeBlock = false;

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) { inCodeBlock = !inCodeBlock; return; }
    if (inCodeBlock) return;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('<!--')) return;
    if (!isCommandLike(trimmed)) return;

    const output = lintWithFix(trimmed, config);
    if (output.result.messages.length === 0) return;
    results.push({ lineNum: idx + 1, result: output.result, fix: output.fix });
  });

  return results;
}

function isCommandLike(line: string): boolean {
  if (/해줘|해주세요|하세요|해줄|해야|해라|할 것|하시오/.test(line)) return true;
  if (/^(write|create|implement|add|fix|delete|refactor|test|commit|deploy|run|make|ensure|always|never)\b/i.test(line)) return true;
  if (/[을를]\s*(작성|사용|생성|구현|추가|삭제|수정|정리|검토)/.test(line)) return true;
  if (/반드시|절대|항상|모든|전체/.test(line)) return true;
  return false;
}
