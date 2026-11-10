export const MAX_LOCAL_JSON_FILE_BYTES = 5 * 1024 * 1024

export interface LocalJsonFile {
  readonly name: string
  readonly size: number
  text(): Promise<string>
}

export type LocalJsonFileErrorCode =
  'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'EMPTY_FILE' | 'FILE_READ_FAILED'

export type LocalJsonFileReadResult =
  | {
      success: true
      content: string
    }
  | {
      success: false
      code: LocalJsonFileErrorCode
    }

export async function readLocalJsonFile(
  file: LocalJsonFile,
): Promise<LocalJsonFileReadResult> {
  if (!/\.json$/i.test(file.name)) {
    return {
      success: false,
      code: 'INVALID_FILE_TYPE',
    }
  }

  if (file.size > MAX_LOCAL_JSON_FILE_BYTES) {
    return {
      success: false,
      code: 'FILE_TOO_LARGE',
    }
  }

  if (file.size === 0) {
    return {
      success: false,
      code: 'EMPTY_FILE',
    }
  }

  try {
    const content = await file.text()

    if (content.trim().length === 0) {
      return {
        success: false,
        code: 'EMPTY_FILE',
      }
    }

    return {
      success: true,
      content,
    }
  } catch {
    return {
      success: false,
      code: 'FILE_READ_FAILED',
    }
  }
}

export function getSafeLocalJsonFileErrorText(code: string): string {
  switch (code) {
    case 'INVALID_FILE_TYPE':
      return 'Select a file with a .json extension.'

    case 'FILE_TOO_LARGE':
      return 'The file exceeds the 5 MiB limit.'

    case 'EMPTY_FILE':
      return 'The file is empty or contains only whitespace.'

    case 'FILE_READ_FAILED':
      return 'The selected file could not be read.'

    default:
      return 'The JSON file could not be imported.'
  }
}

export function createLocalJsonImportSession() {
  let revision = 0

  return {
    invalidate(): void {
      revision += 1
    },

    async readLatest(
      file: LocalJsonFile,
      onComplete: (result: LocalJsonFileReadResult) => void,
    ): Promise<void> {
      revision += 1
      const currentRevision = revision

      const result = await readLocalJsonFile(file)

      if (currentRevision === revision) {
        onComplete(result)
      }
    },
  }
}
