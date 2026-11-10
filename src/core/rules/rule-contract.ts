import type { Finding, RuleId } from '../models/finding'

import type { NormalizedWorkflow } from '../models/normalized-workflow'

export interface AuditRule {
  readonly id: RuleId
  readonly description: string

  run(workflow: NormalizedWorkflow): Finding[]
}
