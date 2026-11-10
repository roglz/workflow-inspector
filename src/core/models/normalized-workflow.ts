export interface NormalizedNode {
  nodeIndex: number
  id: string | undefined
  name: string
  type: string
}

export interface NormalizedWorkflow {
  nodes: NormalizedNode[]

  // Raw connections are preserved for future validation rules.
  // Optional for compatibility with existing synthetic workflows.
  connections?: Record<string, unknown>
}
