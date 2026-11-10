import { z } from 'zod'

export const ruleIds = [
  'R01',
  'R02',
  'R03',
  'R04',
  'R05',
  'R06',
  'R07',
  'R08',
  'R09',
  'R10',
] as const

export const findingSeveritySchema = z.enum(['error', 'warning', 'info'])

export const findingConfidenceSchema = z.enum(['high', 'medium', 'low'])

export const findingSchema = z.strictObject({
  ruleId: z.enum(ruleIds),
  severity: findingSeveritySchema,
  confidence: findingConfidenceSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  recommendation: z.string().min(1),
  nodeIndex: z.number().int().nonnegative().optional(),
})

export type RuleId = (typeof ruleIds)[number]

export type FindingSeverity = z.infer<typeof findingSeveritySchema>

export type FindingConfidence = z.infer<typeof findingConfidenceSchema>

export type Finding = z.infer<typeof findingSchema>
