'use client'

/**
 * Canonical official letters live in `views/`. This module is the stable
 * import path used by the request-detail screen; it re-exports the response
 * letter, the employee application letter and the print helper so existing
 * imports keep working.
 *
 * `LetterView`       — HR response letter (DPP letterhead, NAKALA).
 * `RequestLetterView` — employee application letter (separate design).
 */
export {
  LetterView,
  printLetter,
  type LetterViewProps,
} from '@/components/leave/views/letter-view'

export {
  RequestLetterView,
  type RequestLetterViewProps,
} from '@/components/leave/views/request-letter-view'

export { default } from '@/components/leave/views/letter-view'
