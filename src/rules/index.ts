import type { Rule, CommandAST, LintMessage, CcLintConfig, RuleId } from '../types.js';
import { ambiguousQualifierRule } from './built-in/ambiguous-qualifier.js';
import { missingConstraintRule } from './built-in/missing-constraint.js';
import { conflictingRulesRule } from './built-in/conflicting-rules.js';
import { implicitAssumptionRule } from './built-in/implicit-assumption.js';
import { unboundedScopeRule } from './built-in/unbounded-scope.js';
import { noSubjectiveCriterionRule } from './built-in/no-subjective-criterion.js';
import { vagueQuantifierRule } from './built-in/vague-quantifier.js';
import { noRollbackPlanRule } from './built-in/no-rollback-plan.js';

export const BUILT_IN_RULES: Rule[] = [
  ambiguousQualifierRule,
  missingConstraintRule,
  conflictingRulesRule,
  implicitAssumptionRule,
  unboundedScopeRule,
  noSubjectiveCriterionRule,
  vagueQuantifierRule,
  noRollbackPlanRule,
];

export function runRules(ast: CommandAST, config: CcLintConfig): LintMessage[] {
  const messages: LintMessage[] = [];

  for (const rule of BUILT_IN_RULES) {
    const configuredSeverity = config.rules[rule.id as RuleId];
    if (configuredSeverity === 'off') continue;

    const ruleMessages = rule.check(ast);

    // config에서 severity 오버라이드
    // 'off'는 위에서 continue로 걸러짐 → 여기서는 'error' | 'warn' | undefined
    for (const msg of ruleMessages) {
      messages.push(
        configuredSeverity
          ? { ...msg, severity: configuredSeverity }
          : msg
      );
    }
  }

  return messages;
}
