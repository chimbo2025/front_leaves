/**
 * avatar.ts
 * ---------
 * Pure avatar-identity helpers shared by the React component and the API
 * mappers. No React, no imports — this file is also exercised directly by
 * `scripts/avatar.test.mjs`.
 *
 * The backend already returns `avatar_initials`, but the UI must stay correct
 * for cached rows, optimistic rows (a just-registered employee before the list
 * refresh lands) and the bundled offline roster, all of which may only carry
 * a display name. The same rule therefore lives on both sides:
 *
 *   first letter of the first name + first letter of the last name, uppercase.
 *   One name only -> its first two letters. Nothing at all -> a placeholder.
 */

export interface AvatarIdentity {
  name?: string | null
  initials?: string | null
  photoUrl?: string | null
}

export interface ResolvedAvatar {
  kind: 'photo' | 'initials' | 'placeholder'
  /** The photo URL when `kind === 'photo'`, otherwise 1–2 uppercase characters. */
  value: string
}

/** Fallback shown when there is neither a photo, initials nor a usable name. */
export const AVATAR_PLACEHOLDER = '?'

/** Unicode-safe characters of a string (never splits a surrogate pair). */
function chars(value: string): string[] {
  return Array.from(value)
}

function firstLetters(word: string, count: number): string {
  return chars(word).slice(0, count).join('')
}

/**
 * Keep only a short alphanumeric value and uppercase it.
 * `'--'`, `'—'`, `''` and `null` all normalise to `''` so the caller can fall
 * through to the name-derived value.
 */
export function normalizeInitials(value?: string | null): string {
  if (!value) return ''
  const letters = chars(String(value).trim())
    .filter((c) => /[\p{L}\p{N}]/u.test(c))
    .slice(0, 2)
    .join('')

  return letters.toUpperCase()
}

/**
 * "Haji Ali Said" -> "HS", "Asha" -> "AS", " haji " -> "HA".
 * Splits on whitespace only: apostrophes and hyphens belong to the name.
 */
export function initialsFromName(name?: string | null): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return ''

  if (parts.length === 1) {
    return firstLetters(parts[0], 2).toUpperCase()
  }

  const first = firstLetters(parts[0], 1)
  const last = firstLetters(parts[parts.length - 1], 1)

  return (first + last).toUpperCase()
}

/**
 * Single decision point for what an avatar renders.
 *
 * A photo always wins. Otherwise explicit initials win over the name (so the
 * server's value is authoritative), and the name is the offline fallback.
 */
export function resolveAvatar({ name, initials, photoUrl }: AvatarIdentity): ResolvedAvatar {
  const photo = String(photoUrl ?? '').trim()
  if (photo !== '') return { kind: 'photo', value: photo }

  const explicit = normalizeInitials(initials)
  if (explicit !== '') return { kind: 'initials', value: explicit }

  const derived = initialsFromName(name)
  if (derived !== '') return { kind: 'initials', value: derived }

  return { kind: 'placeholder', value: AVATAR_PLACEHOLDER }
}
