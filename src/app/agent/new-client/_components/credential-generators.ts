/**
 * Deterministic credential generators for client records.
 * These produce the same output for the same input (name + DOB).
 * Generated values are persisted in ClientRecord.generatedCredentials
 * so they're only computed once per record.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Simple deterministic hash from a string — same input always gives same output */
function stableHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

const GMAIL_PATTERNS = [
  (f: string, l: string, bm: string, bd: string) => `${f}${l}${bm}${bd}`,
  (f: string, l: string, _bm: string, bd: string) => `${l}${f}${bd}${_bm}`,
  (f: string, l: string, bm: string, bd: string) => `${f[0]}${l}${bm}${bd}`,
  (f: string, l: string, _bm: string, bd: string) => `${l}${f[0]}${bd}${_bm}`,
  (f: string, l: string, bm: string, bd: string) => `${f}${l[0]}${bm}${bd}`,
] as const

/** Total number of Gmail suggestion patterns available for cycling */
export const GMAIL_PATTERN_COUNT = GMAIL_PATTERNS.length

/** One stable Gmail suggestion per client (deterministic from name + DOB only) */
export function generateGmailSuggestion(firstName: string, lastName: string, dob: string): string {
  if (!firstName || !lastName) return ''
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '')
  if (!f || !l) return ''

  const dobDate = dob ? new Date(dob) : null
  const birthMonth = dobDate ? pad2(dobDate.getMonth() + 1) : '01'
  const birthDay = dobDate ? pad2(dobDate.getDate()) : '01'

  const idx = stableHash(f + l + dob) % GMAIL_PATTERNS.length
  const local = GMAIL_PATTERNS[idx](f, l, birthMonth, birthDay)
  return `${local}@gmail.com`
}

/**
 * Generate a Gmail suggestion at a specific pattern index.
 * Used for cycling through alternatives when the default suggestion is taken.
 * @param index Pattern index (wraps around GMAIL_PATTERN_COUNT)
 */
export function generateGmailSuggestionAtIndex(
  firstName: string,
  lastName: string,
  dob: string,
  index: number,
): string {
  if (!firstName || !lastName) return ''
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '')
  if (!f || !l) return ''

  const dobDate = dob ? new Date(dob) : null
  const birthMonth = dobDate ? pad2(dobDate.getMonth() + 1) : '01'
  const birthDay = dobDate ? pad2(dobDate.getDate()) : '01'

  const patternIdx = ((index % GMAIL_PATTERNS.length) + GMAIL_PATTERNS.length) % GMAIL_PATTERNS.length
  const local = GMAIL_PATTERNS[patternIdx](f, l, birthMonth, birthDay)
  return `${local}@gmail.com`
}

const GMAIL_PW_PHRASES = ['Welcome', 'Hello', 'MyMail', 'Access', 'Login'] as const
const GMAIL_PW_SUFFIXES = (bm: string, bd: string, by: string) => [`${bm}${bd}!`, `${bd}${bm}#`, `${bm}${by}!`]

/** One stable Gmail password per client */
export function generateGmailPassword(firstName: string, lastName: string, dob: string): string {
  if (!dob) return ''
  const dobDate = new Date(dob)
  if (isNaN(dobDate.getTime())) return ''
  const bm = pad2(dobDate.getMonth() + 1)
  const bd = pad2(dobDate.getDate())
  const by = String(dobDate.getFullYear()).slice(-2)
  const h = stableHash((firstName || '') + (lastName || '') + dob)
  const phrase = GMAIL_PW_PHRASES[h % GMAIL_PW_PHRASES.length]
  const suffixes = GMAIL_PW_SUFFIXES(bm, bd, by)
  const suffix = suffixes[(h >> 3) % suffixes.length]
  return `${phrase}${suffix}`
}

const BETMGM_PHRASES = ['ihopeitwillwork', 'letmewin', 'luckyday', 'gametime', 'bigwin'] as const

/** One stable BetMGM password per client */
export function generateBetmgmPassword(firstName: string, lastName: string, dob: string): string {
  if (!dob) return ''
  const dobDate = new Date(dob)
  if (isNaN(dobDate.getTime())) return ''
  const bm = pad2(dobDate.getMonth() + 1)
  const bd = pad2(dobDate.getDate())
  const by = String(dobDate.getFullYear()).slice(-2)
  const h = stableHash((firstName || '') + (lastName || '') + dob)
  const phrase = BETMGM_PHRASES[h % BETMGM_PHRASES.length]
  const suffixOptions = [`${bm}${bd}`, `${bd}${bm}`, `${bm}${by}`]
  const suffix = suffixOptions[(h >> 3) % suffixOptions.length]
  return `${phrase}${suffix}`
}
