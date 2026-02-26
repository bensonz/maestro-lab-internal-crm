/**
 * Server-side credential generation for client drafts.
 * Ensures generatedCredentials are computed and persisted before
 * the form loads, so the client never needs a round-trip to save them.
 *
 * Uses the same deterministic generators as the client-side code
 * (credential-generators.ts in the new-client components).
 */

import prisma from '@/backend/prisma/client'
import {
  generateGmailSuggestion,
  generateGmailPassword,
  generateBetmgmPassword,
} from '@/app/agent/new-client/_components/credential-generators'

// ── Random password / PIN generation (mirrors client-form.tsx) ──

const PWD_WORDS = [
  'Swift', 'Cedar', 'Maple', 'Tiger', 'River', 'Storm', 'Blade', 'Frost',
  'Ember', 'Ridge', 'Drake', 'Flare', 'Prism', 'Coral', 'Haven', 'Lunar',
  'Orbit', 'Cobalt', 'Dune', 'Finch', 'Grove', 'Hawk', 'Ivory', 'Jade',
  'Knoll', 'Lance', 'Mesa', 'Nova', 'Onyx', 'Pines',
]
const PWD_SPECIALS = ['!', '@', '#', '$']

function genPwd(): string {
  const word = PWD_WORDS[Math.floor(Math.random() * PWD_WORDS.length)]
  const digits = String(Math.floor(1000 + Math.random() * 9000))
  const special = PWD_SPECIALS[Math.floor(Math.random() * PWD_SPECIALS.length)]
  return `${word}${digits}${special}`
}

function generatePinPair(): { pin4: string; pin6: string } {
  const base = String(Math.floor(1000 + Math.random() * 9000))
  const suffix = String(Math.floor(10 + Math.random() * 90))
  return { pin4: base, pin6: base + suffix }
}

interface GeneratedCredentials {
  gmailSuggestion?: string
  gmailPassword?: string
  betmgmPassword?: string
  platformPasswords?: Record<string, string>
  bankPin4?: string
  bankPin6?: string
}

/**
 * Ensure a draft has generated credentials. If any are missing,
 * generate and persist them. Returns the draft with updated credentials.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureGeneratedCredentials<T extends Record<string, any>>(draft: T): Promise<T> {
  const stored = (draft.generatedCredentials ?? null) as GeneratedCredentials | null
  const creds: GeneratedCredentials = { ...(stored ?? {}) }
  let changed = false

  // Step 3 credentials: platform passwords + bank PINs
  if (!creds.platformPasswords) {
    creds.platformPasswords = {
      sportsbook: genPwd(),
      BETMGM: genPwd(),
      PAYPAL: genPwd(),
      EDGEBOOST: genPwd(),
      BANK: genPwd(),
    }
    changed = true
  }
  if (!creds.bankPin4) {
    const pair = generatePinPair()
    creds.bankPin4 = pair.pin4
    creds.bankPin6 = pair.pin6
    changed = true
  }

  // Step 1 credentials: Gmail + BetMGM (deterministic from name+DOB)
  const firstName = draft.firstName ?? ''
  const lastName = draft.lastName ?? ''
  const dob = draft.dateOfBirth ?? ''
  if (firstName && lastName && !creds.gmailSuggestion) {
    creds.gmailSuggestion = generateGmailSuggestion(firstName, lastName, dob)
    creds.gmailPassword = generateGmailPassword(firstName, lastName, dob)
    creds.betmgmPassword = generateBetmgmPassword(firstName, lastName, dob)
    changed = true
  }

  if (changed) {
    await prisma.clientDraft.update({
      where: { id: draft.id },
      data: { generatedCredentials: JSON.parse(JSON.stringify(creds)) },
    })
  }

  return { ...draft, generatedCredentials: creds }
}
