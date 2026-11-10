import type { WorkflowInput } from '../models/workflow-input'
import type { NormalizedWorkflow } from '../models/normalized-workflow'

export function normalizeWorkflow(workflow: WorkflowInput): NormalizedWorkflow {
  return {
    nodes: workflow.nodes.map((node, nodeIndex) => ({
      nodeIndex,
      id: node.id,
      name: node.name,
      type: node.type,
    })),

    connections: structuredClone(workflow.connections),
  }
}
