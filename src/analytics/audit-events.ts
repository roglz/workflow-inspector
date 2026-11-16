export type AuditFailureReason =
  'invalid_json' | 'invalid_structure' | 'technical_error'

type AuditEventName = 'audit_started' | 'audit_completed' | 'audit_failed'

interface UmamiTracker {
  track: (event: AuditEventName, data?: { reason: AuditFailureReason }) => void
}

type UmamiWindow = Window & {
  umami?: UmamiTracker
}

export function classifyAuditFailure(code: string): AuditFailureReason {
  switch (code) {
    case 'INVALID_JSON':
      return 'invalid_json'

    case 'INVALID_STRUCTURE':
      return 'invalid_structure'

    default:
      return 'technical_error'
  }
}

function trackEvent(
  event: AuditEventName,
  data?: { reason: AuditFailureReason },
): void {
  if (typeof window === 'undefined') {
    return
  }

  const tracker = (window as UmamiWindow).umami

  if (!tracker || typeof tracker.track !== 'function') {
    return
  }

  try {
    if (data) {
      tracker.track(event, data)
    } else {
      tracker.track(event)
    }
  } catch {
    // Analytics failures must never interrupt local audits.
    return
  }
}

export function trackAuditStarted(): void {
  trackEvent('audit_started')
}

export function trackAuditCompleted(): void {
  trackEvent('audit_completed')
}

export function trackAuditFailed(code: string): void {
  trackEvent('audit_failed', {
    reason: classifyAuditFailure(code),
  })
}
