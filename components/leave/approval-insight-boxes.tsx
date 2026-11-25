'use client'

import type { ApprovalInsight } from '@/lib/leave-api'

/**
 * Approval insight boxes removed per requirement — the balance breakdown
 * and annual payment cycle guidance are no longer shown in approval modals.
 * The component accepts the same props for backwards compatibility but
 * renders nothing.
 */
export function ApprovalInsightBoxes({
  insight,
  loading,
  isFinalStep,
  isAnnual,
  proposedDays,
  fallbackBalance,
}: {
  insight: ApprovalInsight | null
  loading: boolean
  isFinalStep: boolean
  isAnnual: boolean
  proposedDays: number
  fallbackBalance?: { remaining: number } | null
}): null {
  return null
}

export default ApprovalInsightBoxes