import type { Finding } from '../models/finding'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { r01DuplicateNodeIdsRule } from '../rules/r01-duplicate-node-ids'
import { r02DuplicateNodeNamesRule } from '../rules/r02-duplicate-node-names'
import { r03DanglingNodeReferencesRule } from '../rules/r03-dangling-node-references'
import { r04MalformedConnectionsRule } from '../rules/r04-malformed-connections'
import { r05IsolatedNodesRule } from '../rules/r05-isolated-nodes'
import { r06DisconnectedGroupsRule } from '../rules/r06-disconnected-groups'
import { r07MainConnectionCyclesRule } from '../rules/r07-main-connection-cycles'
import { r08DuplicateConnectionsRule } from '../rules/r08-duplicate-connections'
import { r09MissingNodeIdsRule } from '../rules/r09-missing-node-ids'
import { r10BlankNodeNamesRule } from '../rules/r10-blank-node-names'
import type { AuditRule } from '../rules/rule-contract'
import { runRules } from '../rules/run-rules'

type ParseFailure = Extract<
  ReturnType<typeof parseWorkflowJson>,
  { success: false }
>

type RuleFailure = Extract<ReturnType<typeof runRules>, { success: false }>

export type AuditWorkflowResult =
  | {
      success: true
      nodeCount: number
      findings: Finding[]
    }
  | ParseFailure
  | RuleFailure

const auditRules: readonly AuditRule[] = [
  r01DuplicateNodeIdsRule,
  r02DuplicateNodeNamesRule,
  r03DanglingNodeReferencesRule,
  r04MalformedConnectionsRule,
  r05IsolatedNodesRule,
  r06DisconnectedGroupsRule,
  r07MainConnectionCyclesRule,
  r08DuplicateConnectionsRule,
  r09MissingNodeIdsRule,
  r10BlankNodeNamesRule,
]

export function auditWorkflowJson(raw: string): AuditWorkflowResult {
  const parsed = parseWorkflowJson(raw)

  if (!parsed.success) {
    return parsed
  }

  const normalized = normalizeWorkflow(parsed.workflow)
  const execution = runRules(normalized, auditRules)

  if (!execution.success) {
    return execution
  }

  return {
    success: true,
    nodeCount: normalized.nodes.length,
    findings: execution.findings,
  }
}
