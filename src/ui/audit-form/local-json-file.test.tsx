import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import App from '../../App'
import {
  createLocalJsonImportSession,
  getSafeLocalJsonFileErrorText,
  MAX_LOCAL_JSON_FILE_BYTES,
  readLocalJsonFile,
  type LocalJsonFile,
  type LocalJsonFileReadResult,
} from './local-json-file'

function makeFile(
  name: string,
  content: string,
  options: {
    size?: number
    text?: () => Promise<string>
  } = {},
): LocalJsonFile {
  return {
    name,
    size: options.size ?? new TextEncoder().encode(content).length,
    text: options.text ?? (async () => content),
  }
}

function deferredText() {
  let resolve!: (value: string) => void
  let reject!: (error: Error) => void

  const promise = new Promise<string>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('Stage 4 - Local JSON file import', () => {
  it('reads file content without modifying whitespace', async () => {
    const content = ' \n{"nodes":[],"connections":{}}\n '

    const result = await readLocalJsonFile(makeFile('workflow.json', content))

    expect(result).toEqual({
      success: true,
      content,
    })
  })

  it('accepts uppercase JSON extensions', async () => {
    const result = await readLocalJsonFile(makeFile('WORKFLOW.JSON', '{}'))

    expect(result).toEqual({
      success: true,
      content: '{}',
    })
  })

  it('accepts a compound JSON filename', async () => {
    const result = await readLocalJsonFile(
      makeFile('workflow.backup.json', '{}'),
    )

    expect(result.success).toBe(true)
  })

  it('does not require a MIME type', async () => {
    const file = makeFile('workflow.json', '{}')

    const result = await readLocalJsonFile(file)

    expect(result.success).toBe(true)
  })

  it('rejects other extensions before reading', async () => {
    const read = vi.fn(async () => '{}')

    const result = await readLocalJsonFile(
      makeFile('workflow.txt', '{}', { text: read }),
    )

    expect(result).toEqual({
      success: false,
      code: 'INVALID_FILE_TYPE',
    })
    expect(read).not.toHaveBeenCalled()
  })

  it('rejects files ending in .json.txt', async () => {
    const result = await readLocalJsonFile(makeFile('workflow.json.txt', '{}'))

    expect(result).toEqual({
      success: false,
      code: 'INVALID_FILE_TYPE',
    })
  })

  it('rejects zero-byte files without reading', async () => {
    const read = vi.fn(async () => '')

    const result = await readLocalJsonFile(
      makeFile('empty.json', '', {
        size: 0,
        text: read,
      }),
    )

    expect(result).toEqual({
      success: false,
      code: 'EMPTY_FILE',
    })
    expect(read).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only file', async () => {
    const result = await readLocalJsonFile(makeFile('blank.json', ' \t  '))

    expect(result).toEqual({
      success: false,
      code: 'EMPTY_FILE',
    })
  })

  it('rejects a file containing only line breaks', async () => {
    const result = await readLocalJsonFile(makeFile('blank.json', '\n\r\n'))

    expect(result).toEqual({
      success: false,
      code: 'EMPTY_FILE',
    })
  })

  it('rejects oversized files before reading', async () => {
    const read = vi.fn(async () => '{}')

    const result = await readLocalJsonFile(
      makeFile('large.json', '{}', {
        size: MAX_LOCAL_JSON_FILE_BYTES + 1,
        text: read,
      }),
    )

    expect(result).toEqual({
      success: false,
      code: 'FILE_TOO_LARGE',
    })
    expect(read).not.toHaveBeenCalled()
  })

  it('accepts a file at the exact size limit', async () => {
    const result = await readLocalJsonFile(
      makeFile('limit.json', '{}', {
        size: MAX_LOCAL_JSON_FILE_BYTES,
      }),
    )

    expect(result).toEqual({
      success: true,
      content: '{}',
    })
  })

  it('leaves JSON syntax validation to the parser', async () => {
    const result = await readLocalJsonFile(makeFile('broken.json', '{"nodes":'))

    expect(result).toEqual({
      success: true,
      content: '{"nodes":',
    })
  })

  it('does not modify the file descriptor', async () => {
    const file = makeFile('workflow.json', '{}')
    const originalName = file.name
    const originalSize = file.size

    await readLocalJsonFile(file)

    expect(file.name).toBe(originalName)
    expect(file.size).toBe(originalSize)
  })

  it('handles an asynchronous read failure', async () => {
    const result = await readLocalJsonFile(
      makeFile('workflow.json', '{}', {
        text: async () => {
          throw new Error('PRIVATE_READ_ERROR')
        },
      }),
    )

    expect(result).toEqual({
      success: false,
      code: 'FILE_READ_FAILED',
    })
    expect(JSON.stringify(result)).not.toContain('PRIVATE_READ_ERROR')
  })

  it('handles a synchronous read exception', async () => {
    const result = await readLocalJsonFile(
      makeFile('workflow.json', '{}', {
        text: () => {
          throw new Error('PRIVATE_SYNC_ERROR')
        },
      }),
    )

    expect(result).toEqual({
      success: false,
      code: 'FILE_READ_FAILED',
    })
  })

  it('does not expose private filenames in errors', async () => {
    const secret = 'SENTINEL_PRIVATE_FILENAME_123'

    const result = await readLocalJsonFile(makeFile(`${secret}.txt`, '{}'))

    expect(result.success).toBe(false)
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it('maps all supported errors to safe English messages', () => {
    const codes = [
      'INVALID_FILE_TYPE',
      'FILE_TOO_LARGE',
      'EMPTY_FILE',
      'FILE_READ_FAILED',
    ]

    for (const code of codes) {
      const message = getSafeLocalJsonFileErrorText(code)

      expect(message.length).toBeGreaterThan(0)
      expect(message).not.toContain(code)
    }
  })

  it('uses a generic message for unknown error codes', () => {
    const secret = 'SENTINEL_PRIVATE_UNKNOWN_ERROR'

    const message = getSafeLocalJsonFileErrorText(secret)

    expect(message).toBe('The JSON file could not be imported.')
    expect(message).not.toContain(secret)
  })

  it('delivers the result of a current file read', async () => {
    const session = createLocalJsonImportSession()
    const results: LocalJsonFileReadResult[] = []

    await session.readLatest(makeFile('current.json', 'CURRENT'), (result) =>
      results.push(result),
    )

    expect(results).toEqual([
      {
        success: true,
        content: 'CURRENT',
      },
    ])
  })

  it('ignores an older successful read after a newer one', async () => {
    const session = createLocalJsonImportSession()
    const oldRead = deferredText()
    const newRead = deferredText()
    const results: LocalJsonFileReadResult[] = []

    const first = session.readLatest(
      makeFile('old.json', 'old', {
        text: () => oldRead.promise,
      }),
      (result) => results.push(result),
    )

    const second = session.readLatest(
      makeFile('new.json', 'new', {
        text: () => newRead.promise,
      }),
      (result) => results.push(result),
    )

    newRead.resolve('NEW')
    await second

    oldRead.resolve('OLD')
    await first

    expect(results).toEqual([
      {
        success: true,
        content: 'NEW',
      },
    ])
  })

  it('ignores an older failed read after a newer success', async () => {
    const session = createLocalJsonImportSession()
    const oldRead = deferredText()
    const results: LocalJsonFileReadResult[] = []

    const first = session.readLatest(
      makeFile('old.json', 'old', {
        text: () => oldRead.promise,
      }),
      (result) => results.push(result),
    )

    await session.readLatest(makeFile('new.json', 'NEW'), (result) =>
      results.push(result),
    )

    oldRead.reject(new Error('PRIVATE_OLD_FAILURE'))
    await first

    expect(results).toEqual([
      {
        success: true,
        content: 'NEW',
      },
    ])
  })

  it('ignores a pending read after manual-edit invalidation', async () => {
    const session = createLocalJsonImportSession()
    const pending = deferredText()
    const results: LocalJsonFileReadResult[] = []

    const task = session.readLatest(
      makeFile('old.json', 'old', {
        text: () => pending.promise,
      }),
      (result) => results.push(result),
    )

    session.invalidate()

    pending.resolve('OUTDATED')
    await task

    expect(results).toEqual([])
  })

  it('lets a newer file error override an older read', async () => {
    const session = createLocalJsonImportSession()
    const pending = deferredText()
    const results: LocalJsonFileReadResult[] = []

    const first = session.readLatest(
      makeFile('old.json', 'old', {
        text: () => pending.promise,
      }),
      (result) => results.push(result),
    )

    await session.readLatest(makeFile('invalid.txt', 'INVALID'), (result) =>
      results.push(result),
    )

    pending.resolve('OUTDATED')
    await first

    expect(results).toEqual([
      {
        success: false,
        code: 'INVALID_FILE_TYPE',
      },
    ])
  })

  it('allows importing the same file more than once', async () => {
    const session = createLocalJsonImportSession()
    const file = makeFile('same.json', 'SAME')
    const results: LocalJsonFileReadResult[] = []

    await session.readLatest(file, (result) => results.push(result))

    await session.readLatest(file, (result) => results.push(result))

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual(results[1])
  })

  it('renders an accessible JSON file selector in App', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('type="file"')
    expect(html).toContain('id="workflow-json-file"')
    expect(html).toContain('for="workflow-json-file"')
    expect(html).toContain('accept=".json,application/json"')
    expect(html).toContain('workflow-json-file-help')
    expect(html).toContain('5 MiB')
  })

  it('keeps the previous textarea and audit button', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('id="workflow-json"')
    expect(html).toContain('Analyze JSON')
    expect(html).toContain('type="submit"')
    expect(html).not.toContain('Audit completed')
    expect(html).not.toContain('Finding details')
  })
})
