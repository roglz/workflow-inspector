import { describe, expect, it } from 'vitest'

import type { NormalizedWorkflow } from '../models/normalized-workflow'
import { normalizeWorkflow } from '../normalizer/normalize-workflow'
import { parseWorkflowJson } from '../parser/parse-workflow-json'
import { r01DuplicateNodeIdsRule } from './r01-duplicate-node-ids'
import { r02DuplicateNodeNamesRule } from './r02-duplicate-node-names'
import { r03DanglingNodeReferencesRule } from './r03-dangling-node-references'
import { r04MalformedConnectionsRule } from './r04-malformed-connections'
import { r05IsolatedNodesRule } from './r05-isolated-nodes'
import { r06DisconnectedGroupsRule } from './r06-disconnected-groups'
import { r07MainConnectionCyclesRule } from './r07-main-connection-cycles'
import { r08DuplicateConnectionsRule } from './r08-duplicate-connections'
import { r09MissingNodeIdsRule } from './r09-missing-node-ids'
import { r10BlankNodeNamesRule } from './r10-blank-node-names'
import { runRules } from './run-rules'

function createWorkflow(
  names: string[],
  connections?: Record<string, unknown>,
): NormalizedWorkflow {
  return {
    nodes: names.map((name, nodeIndex) => ({
      nodeIndex,
      id: `node-${nodeIndex + 1}`,
      name,
      type: 'example.node',
    })),
    ...(connections === undefined ? {} : { connections }),
  }
}

function inputNode(name: string, id: string) {
  return {
    id,
    name,
    type: 'example.node',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  }
}

describe('R10 - Blank node names', () => {
  it('has the expected rule metadata', () => {
    expect(r10BlankNodeNamesRule.id).toBe('R10')
    expect(r10BlankNodeNamesRule.description).toContain('whitespace-only')
  })

  it('returns no findings for an empty workflow', () => {
    expect(r10BlankNodeNamesRule.run(createWorkflow([]))).toEqual([])
  })

  it('accepts ordinary non-blank names', () => {
    const workflow = createWorkflow(['Start', 'HTTP Request', 'Process Data'])

    expect(r10BlankNodeNamesRule.run(workflow)).toEqual([])
  })

  it('detects an empty name on a single node', () => {
    const workflow = createWorkflow([''])

    expect(r10BlankNodeNamesRule.run(workflow)).toEqual([
      {
        ruleId: 'R10',
        severity: 'warning',
        confidence: 'high',
        title: 'Blank node name',
        description: 'Node at position 1 has an empty or whitespace-only name.',
        recommendation:
          'Assign a non-blank, descriptive name and review references to the node.',
        nodeIndex: 0,
      },
    ])
  })

  it('detects a name containing only ordinary spaces', () => {
    const workflow = createWorkflow(['   '])

    const findings = r10BlankNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('detects tabs and newlines without visible text', () => {
    const workflow = createWorkflow(['\t', '\n', ' \t\r\n '])

    const findings = r10BlankNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings.every((finding) => finding.ruleId === 'R10')).toBe(true)
  })

  it('detects Unicode whitespace-only names', () => {
    const workflow = createWorkflow(['\u00a0', '\u2003', ' \u00a0\u2003 '])

    const findings = r10BlankNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([0, 1, 2])
  })

  it('reports multiple blank names in original node order', () => {
    const workflow = createWorkflow(['Start', '', 'Middle', '   ', 'End', '\t'])

    const findings = r10BlankNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(3)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1, 3, 5])
    expect(findings.map((finding) => finding.description)).toEqual([
      'Node at position 2 has an empty or whitespace-only name.',
      'Node at position 4 has an empty or whitespace-only name.',
      'Node at position 6 has an empty or whitespace-only name.',
    ])
  })

  it('accepts names with leading or trailing spaces', () => {
    const workflow = createWorkflow([' Start', 'End ', ' Middle ', '\tValid\n'])

    expect(r10BlankNodeNamesRule.run(workflow)).toEqual([])
  })

  it('accepts names containing internal whitespace', () => {
    const workflow = createWorkflow([
      'HTTP Request',
      'A  B',
      'Line\nBreak',
      'Tab\tSeparated',
    ])

    expect(r10BlankNodeNamesRule.run(workflow)).toEqual([])
  })

  it('does not treat a zero-width space as trimmed whitespace', () => {
    const workflow = createWorkflow(['\u200b'])

    expect(r10BlankNodeNamesRule.run(workflow)).toEqual([])
  })

  it('accepts non-blank Unicode names', () => {
    const workflow = createWorkflow([
      'Procesar datos',
      '处理数据',
      'Обработка',
      'مرحلة',
      '⚙️',
    ])

    expect(r10BlankNodeNamesRule.run(workflow)).toEqual([])
  })

  it('leaves duplicate non-blank names to R02', () => {
    const workflow = createWorkflow(['Same Name', 'Same Name'])

    expect(r10BlankNodeNamesRule.run(workflow)).toEqual([])

    const r02Findings = r02DuplicateNodeNamesRule.run(workflow)

    expect(r02Findings).toHaveLength(1)
    expect(r02Findings[0].ruleId).toBe('R02')
  })

  it('can report blank names independently of R02', () => {
    const workflow = createWorkflow(['', '', 'Valid'])

    const r02Findings = r02DuplicateNodeNamesRule.run(workflow)
    const r10Findings = r10BlankNodeNamesRule.run(workflow)

    expect(r02Findings).toHaveLength(1)
    expect(r10Findings).toHaveLength(2)
    expect(r10Findings.map((finding) => finding.nodeIndex)).toEqual([0, 1])
  })

  it('does not flag names that differ only by case', () => {
    const workflow = createWorkflow(['Node', 'node', 'NODE'])

    expect(r10BlankNodeNamesRule.run(workflow)).toEqual([])
  })

  it('does not require connections to be present', () => {
    const workflow = createWorkflow(['', 'Valid'])

    expect(workflow.connections).toBeUndefined()

    const findings = r10BlankNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].nodeIndex).toBe(0)
  })

  it('does not suppress findings for malformed connections', () => {
    const workflow = createWorkflow(['', 'Valid'], {
      Valid: null,
    })

    const findings = r10BlankNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(findings[0].ruleId).toBe('R10')
  })

  it('does not depend on identifiers being present', () => {
    const workflow = createWorkflow(['', 'Valid'], {})

    workflow.nodes[0].id = undefined

    const r09Findings = r09MissingNodeIdsRule.run(workflow)
    const r10Findings = r10BlankNodeNamesRule.run(workflow)

    expect(r09Findings).toHaveLength(1)
    expect(r10Findings).toHaveLength(1)
    expect(r10Findings[0].nodeIndex).toBe(0)
  })

  it('does not reveal node names, identifiers, or types', () => {
    const secret = 'SENTINEL_PRIVATE_R10_123'

    const workflow = createWorkflow(['   ', secret], {})

    workflow.nodes[0].id = secret
    workflow.nodes[0].type = secret

    const findings = r10BlankNodeNamesRule.run(workflow)

    expect(findings).toHaveLength(1)
    expect(JSON.stringify(findings)).not.toContain(secret)
  })

  it('does not modify the normalized workflow', () => {
    const workflow = createWorkflow(['   ', 'Valid'], {
      Valid: {
        main: [],
      },
    })

    const originalContent = JSON.stringify(workflow)

    r10BlankNodeNamesRule.run(workflow)

    expect(JSON.stringify(workflow)).toBe(originalContent)
  })

  it('works with the parser and normalizer for blank names', () => {
    const rawWorkflow = {
      nodes: [
        inputNode('Valid', 'id-1'),
        inputNode('', 'id-2'),
        inputNode(' \t ', 'id-3'),
      ],
      connections: {},
    }

    const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)

    expect(normalized.nodes[1].name).toBe('')
    expect(normalized.nodes[2].name).toBe(' \t ')

    const findings = r10BlankNodeNamesRule.run(normalized)

    expect(findings).toHaveLength(2)
    expect(findings.map((finding) => finding.nodeIndex)).toEqual([1, 2])
  })

  it('leaves missing or non-string names to the parser', () => {
    const missingName = {
      nodes: [
        {
          id: 'id-1',
          type: 'example.node',
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
      ],
      connections: {},
    }

    const nonStringName = {
      nodes: [
        {
          ...inputNode('Valid', 'id-2'),
          name: null,
        },
      ],
      connections: {},
    }

    for (const rawWorkflow of [missingName, nonStringName]) {
      const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

      expect(parsed.success).toBe(false)

      if (!parsed.success) {
        expect(parsed.error.code).toBe('INVALID_STRUCTURE')
      }
    }
  })

  it('works with the parser, normalizer, and R01-R09', () => {
    const rawWorkflow = {
      nodes: [inputNode('Start', 'id-1'), inputNode('   ', 'id-2')],
      connections: {},
    }

    const parsed = parseWorkflowJson(JSON.stringify(rawWorkflow))

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    const normalized = normalizeWorkflow(parsed.workflow)

    const result = runRules(normalized, [
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
    ])

    expect(result).toEqual({
      success: true,
      findings: [
        {
          ruleId: 'R10',
          severity: 'warning',
          confidence: 'high',
          title: 'Blank node name',
          description:
            'Node at position 2 has an empty or whitespace-only name.',
          recommendation:
            'Assign a non-blank, descriptive name and review references to the node.',
          nodeIndex: 1,
        },
      ],
    })
  })
})
