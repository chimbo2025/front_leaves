'use client'

/**
 * Canonical official letter lives in `views/letter-view.tsx`. This module is
 * the stable import path used by the request-detail screen; it re-exports the
 * component and the print helper so existing imports keep working.
 */
export {
  LetterView,
  printLetter,
  type LetterViewProps,
} from '@/components/leave/views/letter-view'

export { default } from '@/components/leave/views/letter-view'
