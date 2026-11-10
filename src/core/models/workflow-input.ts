import { z } from 'zod'

export const workflowNodeInputSchema = z.looseObject({
  id: z.string().optional(),
  name: z.string(),
  type: z.string(),
  typeVersion: z.number(),
  position: z.tuple([z.number(), z.number()]),
  parameters: z.record(z.string(), z.unknown()),
})

export const workflowInputSchema = z.looseObject({
  name: z.string().optional(),
  nodes: z.array(workflowNodeInputSchema),
  connections: z.record(z.string(), z.unknown()),
})

export type WorkflowNodeInput = z.infer<typeof workflowNodeInputSchema>

export type WorkflowInput = z.infer<typeof workflowInputSchema>
