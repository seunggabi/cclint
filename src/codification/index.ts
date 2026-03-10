import { execSync } from 'child_process';
import type { CommandSchema, CodificationResult } from '../types.js';

// ─── Codification 분석: 프롬프트를 JSON Schema로 변환 및 코드화 가능성 분석 ──────

/**
 * 테스트용 모의 응답 생성 (Claude CLI 없을 때)
 */
function generateMockResponse(command: string): string {
  // 프롬프트에서 파라미터 자동 추출
  const containsPerformance = /성능|performance|속도|speed|응답시간|latency|처리량|throughput/i.test(command);
  const containsCode = /코드|code|리팩토링|refactor|깔끔|clean/i.test(command);
  const containsTest = /테스트|test|커버리지|coverage|jest|vitest/i.test(command);

  if (containsPerformance) {
    return JSON.stringify({
      operation: 'improve',
      target: 'performance',
      parameters: [
        { name: 'metric', type: 'enum', required: true, value: null, enum: ['latency', 'throughput', 'memory', 'cpu'], codified: false },
        { name: 'target_value', type: 'number', required: true, value: null, enum: [], codified: false },
        { name: 'unit', type: 'enum', required: true, value: null, enum: ['ms', 'req/s', 'MB', '%'], codified: false },
      ],
    });
  }

  if (containsCode) {
    return JSON.stringify({
      operation: 'refactor',
      target: 'code',
      parameters: [
        { name: 'style', type: 'enum', required: true, value: null, enum: ['readable', 'concise', 'performant'], codified: false },
        { name: 'scope', type: 'string', required: true, value: null, enum: [], codified: false },
      ],
    });
  }

  if (containsTest) {
    return JSON.stringify({
      operation: 'test',
      target: 'test',
      parameters: [
        { name: 'framework', type: 'enum', required: false, value: 'jest', enum: ['jest', 'vitest', 'mocha'], codified: true },
        { name: 'coverage', type: 'number', required: false, value: null, enum: [], codified: false },
        { name: 'target', type: 'string', required: false, value: null, enum: [], codified: false },
      ],
    });
  }

  // 기본값
  return JSON.stringify({
    operation: 'improve',
    target: 'general',
    parameters: [
      { name: 'aspect', type: 'string', required: true, value: null, enum: [], codified: false },
      { name: 'criteria', type: 'string', required: true, value: null, enum: [], codified: false },
    ],
  });
}

function buildCodificationPrompt(command: string): string {
  return `다음 프롬프트를 구조화된 JSON Schema로 변환하고, 각 파라미터의 명확성(Codification)을 분석해주세요.

원본: "${command}"

응답은 다음 JSON 형식으로 해주세요 (JSON만 응답):
{
  "operation": "동작 (improve, refactor, add, fix, implement, test, ...)",
  "target": "대상 (performance, code, test, documentation, security, ...)",
  "parameters": [
    {
      "name": "파라미터명",
      "type": "metric|number|string|enum|boolean",
      "required": true,
      "value": "프롬프트에서 추출한 값 또는 null",
      "enum": ["가능한 선택지들"],
      "example": "사용 예시",
      "codified": true
    }
  ]
}

분석 규칙:
- 프롬프트에서 명시된 값이 있으면 codified: true
- 값이 모호하거나 없으면 codified: false
- required: true인 파라미터만 Score 계산에 포함`;
}

function calculateCodificationScore(schema: CommandSchema): number {
  const requiredParams = schema.parameters.filter(p => p.required);
  if (requiredParams.length === 0) return 100;

  const codifiedCount = requiredParams.filter(p => p.codified).length;
  return Math.round((codifiedCount / requiredParams.length) * 100);
}

function generateAnalysisIssues(schema: CommandSchema): Array<{
  parameter: string;
  reason: string;
  suggestion: string;
}> {
  return schema.parameters
    .filter(p => p.required && !p.codified)
    .map(p => ({
      parameter: p.name,
      reason: '정의되지 않음',
      suggestion: p.enum && p.enum.length > 0
        ? `"${p.name}"을(를) 지정하세요. 예: ${p.enum.slice(0, 3).join(', ')} 중 선택`
        : `"${p.name}"을(를) 구체적으로 명시하세요. 예: "${p.example ?? ''}"`,
    }));
}

export function analyzeCodification(command: string): CodificationResult {
  const prompt = buildCodificationPrompt(command);

  try {
    // Claude CLI 호출 (suggest/index.ts와 동일한 방식)
    const escaped = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    let raw: string;

    try {
      raw = execSync(`claude -p "${escaped}" 2>/dev/null`, {
        encoding: 'utf-8',
        timeout: 30000,
      }).trim();
    } catch {
      // Claude CLI가 없을 경우 모의 응답 사용
      console.error('⚠️  Claude CLI를 찾을 수 없습니다. 모의 분석을 진행합니다.');
      raw = generateMockResponse(command);
    }

    // JSON 블록 추출
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Invalid response format. Got: ${raw.substring(0, 100)}`);
    }

    const schema = JSON.parse(jsonMatch[0]) as CommandSchema;

    // Score 계산
    const codificationScore = calculateCodificationScore(schema);
    const requiredParams = schema.parameters.filter(p => p.required);
    const codifiedCount = requiredParams.filter(p => p.codified).length;
    const undefinedCount = requiredParams.length - codifiedCount;

    // 분석 정보 생성
    const issues = generateAnalysisIssues(schema);

    const result: CodificationResult = {
      command,
      schema: {
        ...schema,
        codificationScore,
        analysis: {
          codifiedCount,
          undefinedCount,
          issues,
        },
      },
      determinism: {
        score: codificationScore,
        level: codificationScore >= 80 ? 'HIGH' : codificationScore >= 50 ? 'MEDIUM' : 'LOW',
      },
    };

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Codification analysis failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Codification 분석 결과를 사용자 친화적으로 포맷팅
 */
export function formatCodificationResult(result: CodificationResult): string {
  const { command, schema, determinism } = result;
  const scoreEmoji =
    determinism.level === 'HIGH'
      ? '🟢'
      : determinism.level === 'MEDIUM'
        ? '🟡'
        : '🔴';

  let output = '';
  output += `\n프롬프트: "${command}"\n`;
  output += `동작: ${schema.operation} | 대상: ${schema.target}\n`;
  output += `\nCodification Score: ${determinism.score}/100 ${scoreEmoji} (${determinism.level})\n`;

  if (schema.analysis.issues.length > 0) {
    output += `\n⚠️  명확하지 않은 파라미터 (${schema.analysis.undefinedCount}개):\n`;
    for (const issue of schema.analysis.issues) {
      output += `  - ${issue.parameter}: ${issue.suggestion}\n`;
    }
  } else {
    output += `\n✅ 모든 필수 파라미터가 명확합니다!\n`;
  }

  return output;
}
