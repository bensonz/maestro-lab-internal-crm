'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { UploadDropzone, ScreenshotThumbnail } from '@/components/upload-dropzone'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScanLine, HelpCircle, Loader2, ChevronDown } from 'lucide-react'
import { IdDetectionModal } from './id-detection-modal'
import { GmailDetectionModal } from './gmail-detection-modal'
import { BetmgmDetectionModal } from './betmgm-detection-modal'
import {
  mockExtractFromId,
  mockExtractFromGmail,
  mockExtractFromBetmgm,
  type IdExtractionResult,
  type GmailExtractionResult,
  type BetmgmExtractionResult,
} from './mock-extract-id'

interface Step1Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  onRiskFlagsChange: (flags: Record<string, unknown>) => void
}

const UPLOAD_TIPS = {
  id: {
    what: 'Front of government-issued photo ID (driver\'s license, passport, state ID)',
    not: 'Social security cards, utility bills, expired IDs',
  },
  gmail: {
    what: 'Gmail account registration confirmation screenshot',
    not: 'Other email providers, partial screenshots',
  },
  betmgmReg: {
    what: 'Successful BetMGM registration confirmation page',
    not: 'Partial or cropped screenshots',
  },
  betmgmLogin: {
    what: 'BetMGM login credentials / account page showing deposit options',
    not: 'Personal banking information',
  },
} as const

function computeAge(dobStr: string): number | null {
  if (!dobStr) return null
  const dob = new Date(dobStr)
  if (isNaN(dob.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--
  }
  return age
}

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
  (f: string, l: string, bm: string, bd: string, _tm: string, td: string) => `${f}${l}${bm}${td}`,
  (f: string, l: string, _bm: string, bd: string, tm: string, _td: string) => `${l}${f}${tm}${bd}`,
  (f: string, l: string, bm: string, bd: string, _tm: string, _td: string) => `${f[0]}${l}${bm}${bd}`,
  (f: string, l: string, _bm: string, _bd: string, tm: string, td: string) => `${l}${f[0]}${tm}${td}`,
  (f: string, l: string, bm: string, _bd: string, _tm: string, td: string) => `${f}${l[0]}${bm}${td}`,
] as const

/** One stable Gmail suggestion per client (deterministic from name + DOB) */
function generateGmailSuggestion(firstName: string, lastName: string, dob: string): string {
  if (!firstName || !lastName) return ''
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '')
  if (!f || !l) return ''

  const now = new Date()
  const todayMonth = pad2(now.getMonth() + 1)
  const todayDay = pad2(now.getDate())
  const dobDate = dob ? new Date(dob) : null
  const birthMonth = dobDate ? pad2(dobDate.getMonth() + 1) : todayMonth
  const birthDay = dobDate ? pad2(dobDate.getDate()) : todayDay

  const idx = stableHash(f + l + dob) % GMAIL_PATTERNS.length
  const local = GMAIL_PATTERNS[idx](f, l, birthMonth, birthDay, todayMonth, todayDay)
  return `${local}@gmail.com`
}

const GMAIL_PW_PHRASES = ['Welcome', 'Hello', 'MyMail', 'Access', 'Login'] as const
const GMAIL_PW_SUFFIXES = (bm: string, bd: string, by: string) => [`${bm}${bd}!`, `${bd}${bm}#`, `${bm}${by}!`]

/** One stable Gmail password per client */
function generateGmailPassword(firstName: string, lastName: string, dob: string): string {
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
function generateBetmgmPassword(firstName: string, lastName: string, dob: string): string {
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

function UploadTooltip({ tip }: { tip: { what: string; not: string } }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left space-y-1">
        <p><span className="font-medium">Upload:</span> {tip.what}</p>
        <p><span className="font-medium">Do NOT upload:</span> {tip.not}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function AutoFilledBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
      <ScanLine className="h-3 w-3" />
      Auto
    </span>
  )
}

function SectionCard({
  title,
  extra,
  children,
}: {
  title: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Collapsible>
      <div className="card-terminal w-full overflow-hidden !p-0" data-testid={`section-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CollapsibleTrigger className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-card-hover group" data-testid="section-trigger">
          <span>{title}</span>
          <div className="flex items-center gap-2">
            {extra}
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-4">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function Step1PreQual({ formData, onChange, onRiskFlagsChange }: Step1Props) {
  // ID detection state
  const [detecting, setDetecting] = useState(false)
  const [detectionData, setDetectionData] = useState<IdExtractionResult | null>(null)
  const [showDetectionModal, setShowDetectionModal] = useState(false)
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())

  // Gmail detection state
  const [gmailDetecting, setGmailDetecting] = useState(false)
  const [gmailDetectionData, setGmailDetectionData] = useState<GmailExtractionResult | null>(null)
  const [showGmailModal, setShowGmailModal] = useState(false)

  // BetMGM detection state
  const [betmgmDetecting, setBetmgmDetecting] = useState<'reg' | 'login' | null>(null)
  const [betmgmDetectionData, setBetmgmDetectionData] = useState<BetmgmExtractionResult | null>(null)
  const [betmgmDetectionType, setBetmgmDetectionType] = useState<'registration' | 'login'>('login')
  const [showBetmgmModal, setShowBetmgmModal] = useState(false)

  // Deterministic suggestions — one stable suggestion per client (based on name + DOB)
  const suggestedGmail = useMemo(
    () => generateGmailSuggestion(
      (formData.firstName as string) || '',
      (formData.lastName as string) || '',
      (formData.dateOfBirth as string) || '',
    ),
    [formData.firstName, formData.lastName, formData.dateOfBirth],
  )
  const suggestedGmailPassword = useMemo(
    () => generateGmailPassword(
      (formData.firstName as string) || '',
      (formData.lastName as string) || '',
      (formData.dateOfBirth as string) || '',
    ),
    [formData.firstName, formData.lastName, formData.dateOfBirth],
  )
  const suggestedBetmgmPassword = useMemo(
    () => generateBetmgmPassword(
      (formData.firstName as string) || '',
      (formData.lastName as string) || '',
      (formData.dateOfBirth as string) || '',
    ),
    [formData.firstName, formData.lastName, formData.dateOfBirth],
  )

  // Auto-fill fields when suggestion first becomes available (field empty)
  useEffect(() => {
    if (suggestedGmail && !(formData.assignedGmail as string)) {
      onChange('assignedGmail', suggestedGmail)
    }
  }, [suggestedGmail]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (suggestedGmailPassword && !(formData.gmailPassword as string)) {
      onChange('gmailPassword', suggestedGmailPassword)
    }
  }, [suggestedGmailPassword]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (suggestedBetmgmPassword && !(formData.betmgmPassword as string)) {
      onChange('betmgmPassword', suggestedBetmgmPassword)
    }
  }, [suggestedBetmgmPassword]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill BetMGM login email from assignedGmail when login is empty
  useEffect(() => {
    const gmail = (formData.assignedGmail as string) || ''
    const betmgmLogin = (formData.betmgmLogin as string) || ''
    if (gmail && !betmgmLogin) {
      onChange('betmgmLogin', gmail)
    }
  }, [formData.assignedGmail]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleIdExpiryChange(value: string) {
    onChange('idExpiry', value)
    if (value) {
      const expiry = new Date(value)
      const daysUntil = Math.floor(
        (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      onRiskFlagsChange({ idExpiryDaysRemaining: daysUntil })
    } else {
      onRiskFlagsChange({ idExpiryDaysRemaining: null })
    }
  }

  const handleIdUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (!res.ok) return { success: false, error: data.error ?? 'Upload failed' }

        onChange('idDocument', data.url)

        // Trigger OCR detection
        setDetecting(true)
        try {
          const extracted = await mockExtractFromId(file)
          setDetectionData(extracted)
          setShowDetectionModal(true)
        } finally {
          setDetecting(false)
        }

        return { success: true }
      } catch {
        return { success: false, error: 'Upload failed' }
      }
    },
    [onChange],
  )

  function handleDetectionConfirm(selected: Partial<IdExtractionResult>) {
    const filled = new Set<string>()
    if (selected.firstName) {
      onChange('firstName', selected.firstName)
      filled.add('firstName')
    }
    if (selected.lastName) {
      onChange('lastName', selected.lastName)
      filled.add('lastName')
    }
    if (selected.dateOfBirth) {
      onChange('dateOfBirth', selected.dateOfBirth)
      filled.add('dateOfBirth')
    }
    if (selected.address) {
      onChange('address', selected.address)
      filled.add('address')
    }
    if (selected.idExpiry) {
      handleIdExpiryChange(selected.idExpiry)
      filled.add('idExpiry')
    }
    setAutoFilledFields(filled)
  }

  // Gmail screenshot upload with detection
  const handleGmailScreenshotUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (!res.ok) return { success: false, error: data.error ?? 'Upload failed' }

        onChange('gmailScreenshot', data.url)

        // Trigger Gmail OCR detection
        setGmailDetecting(true)
        try {
          const extracted = await mockExtractFromGmail(file)
          setGmailDetectionData(extracted)
          setShowGmailModal(true)
        } finally {
          setGmailDetecting(false)
        }

        return { success: true }
      } catch {
        return { success: false, error: 'Upload failed' }
      }
    },
    [onChange],
  )

  function handleGmailDetectionConfirm(data: { emailAddress: string; password: string }) {
    if (data.emailAddress) {
      onChange('assignedGmail', data.emailAddress)
      setAutoFilledFields((prev) => new Set([...prev, 'assignedGmail']))
    }
    if (data.password) {
      onChange('gmailPassword', data.password)
      setAutoFilledFields((prev) => new Set([...prev, 'gmailPassword']))
    }
  }

  function makeBetmgmUploadHandler(
    field: 'betmgmRegScreenshot' | 'betmgmLoginScreenshot',
    type: 'registration' | 'login',
  ): (file: File) => Promise<{ success: boolean; error?: string }> {
    return async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (!res.ok) return { success: false, error: data.error ?? 'Upload failed' }
        onChange(field, data.url)

        // Trigger BetMGM OCR detection
        const detectKey = type === 'registration' ? 'reg' as const : 'login' as const
        setBetmgmDetecting(detectKey)
        try {
          const extracted = await mockExtractFromBetmgm(file, type)
          setBetmgmDetectionData(extracted)
          setBetmgmDetectionType(type)
          setShowBetmgmModal(true)
        } finally {
          setBetmgmDetecting(null)
        }

        return { success: true }
      } catch {
        return { success: false, error: 'Upload failed' }
      }
    }
  }

  function handleBetmgmDetectionConfirm(data: BetmgmExtractionResult) {
    // Auto-fill credential fields from detection
    if (data.loginEmail) {
      onChange('betmgmLogin', data.loginEmail)
      setAutoFilledFields((prev) => new Set([...prev, 'betmgmLogin']))
      // Flag mismatch in risk panel if detected email differs from assigned Gmail
      const assignedGmail = (formData.assignedGmail as string) || ''
      onRiskFlagsChange({ betmgmEmailMismatch: !!(assignedGmail && data.loginEmail !== assignedGmail) })
    }
    if (data.loginPassword) {
      onChange('betmgmPassword', data.loginPassword)
      setAutoFilledFields((prev) => new Set([...prev, 'betmgmPassword']))
    }
    // Auto-set betmgmCheckPassed if deposit word detected
    if (data.depositWordDetected) {
      onChange('betmgmCheckPassed', true)
    }
  }

  function makeUploadHandler(
    field: string,
  ): (file: File) => Promise<{ success: boolean; error?: string }> {
    return async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (!res.ok) return { success: false, error: data.error ?? 'Upload failed' }
        onChange(field, data.url)
        return { success: true }
      } catch {
        return { success: false, error: 'Upload failed' }
      }
    }
  }

  const dob = (formData.dateOfBirth as string) || ''
  const age = computeAge(dob)

  return (
    <TooltipProvider>
      <div className="space-y-4" data-testid="step1-prequal">

        {/* ── Section 1: ID Document ───────────────────────── */}
        <SectionCard title="ID Document" extra={<UploadTooltip tip={UPLOAD_TIPS.id} />}>
          {(formData.idDocument as string) ? (
            <div className="flex items-center gap-3">
              <ScreenshotThumbnail
                src={formData.idDocument as string}
                onDelete={() => onChange('idDocument', '')}
              />
              {detecting && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Detecting ID info...
                </span>
              )}
            </div>
          ) : (
            <UploadDropzone
              onUpload={handleIdUpload}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              data-testid="id-upload-dropzone"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="firstName" className="flex items-center gap-1.5">
                First Name *
                {autoFilledFields.has('firstName') && <AutoFilledBadge />}
              </FieldLabel>
              <Input
                id="firstName"
                value={(formData.firstName as string) || ''}
                onChange={(e) => onChange('firstName', e.target.value)}
                placeholder="First name"
                data-testid="client-first-name"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="lastName" className="flex items-center gap-1.5">
                Last Name *
                {autoFilledFields.has('lastName') && <AutoFilledBadge />}
              </FieldLabel>
              <Input
                id="lastName"
                value={(formData.lastName as string) || ''}
                onChange={(e) => onChange('lastName', e.target.value)}
                placeholder="Last name"
                data-testid="client-last-name"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="dateOfBirth" className="flex items-center gap-1.5">
                Date of Birth
                {autoFilledFields.has('dateOfBirth') && <AutoFilledBadge />}
              </FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dob?.split('T')[0] || ''}
                  onChange={(e) => onChange('dateOfBirth', e.target.value)}
                  data-testid="client-date-of-birth"
                  className="flex-1"
                />
                {age !== null && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {age} yrs
                  </span>
                )}
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="idExpiry" className="flex items-center gap-1.5">
                ID Expiry
                {autoFilledFields.has('idExpiry') && <AutoFilledBadge />}
              </FieldLabel>
              <Input
                id="idExpiry"
                type="date"
                value={(formData.idExpiry as string)?.split('T')[0] || ''}
                onChange={(e) => handleIdExpiryChange(e.target.value)}
                data-testid="client-id-expiry"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="address" className="flex items-center gap-1.5">
              Address
              {autoFilledFields.has('address') && <AutoFilledBadge />}
            </FieldLabel>
            <Input
              id="address"
              value={(formData.address as string) || ''}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder="Full address"
              data-testid="client-address"
            />
          </Field>

          {/* Different address question */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="livesAtDifferentAddress"
              checked={formData.livesAtDifferentAddress as boolean}
              onCheckedChange={(checked) => {
                const val = checked === true
                onChange('livesAtDifferentAddress', val)
                onChange('addressMismatch', val)
                onRiskFlagsChange({ multipleAddresses: val })
                if (!val) {
                  onChange('currentAddress', '')
                  onChange('differentAddressDuration', '')
                  onChange('differentAddressProof', '')
                }
              }}
              data-testid="client-lives-different-address"
            />
            <label htmlFor="livesAtDifferentAddress" className="text-sm font-medium">
              Client currently lives at a different address
            </label>
          </div>

          {(formData.livesAtDifferentAddress as boolean) && (
            <div className="space-y-4 rounded-md border p-4">
              <Field>
                <FieldLabel htmlFor="currentAddress">Current Living Address</FieldLabel>
                <Input
                  id="currentAddress"
                  value={(formData.currentAddress as string) || ''}
                  onChange={(e) => onChange('currentAddress', e.target.value)}
                  placeholder="Where does the client currently live?"
                  data-testid="client-current-address"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="differentAddressDuration">How long at this address?</FieldLabel>
                <Select
                  value={(formData.differentAddressDuration as string) || ''}
                  onValueChange={(value) => onChange('differentAddressDuration', value)}
                >
                  <SelectTrigger id="differentAddressDuration" data-testid="client-address-duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="less_than_6mo">Less than 6 months</SelectItem>
                    <SelectItem value="more_than_6mo">More than 6 months</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="differentAddressProof">Proof of address</FieldLabel>
                <Select
                  value={(formData.differentAddressProof as string) || ''}
                  onValueChange={(value) => onChange('differentAddressProof', value)}
                >
                  <SelectTrigger id="differentAddressProof" data-testid="client-address-proof">
                    <SelectValue placeholder="Select proof type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_statement">Bank statement shows this address</SelectItem>
                    <SelectItem value="utility_bill">Utility bill</SelectItem>
                    <SelectItem value="lease_agreement">Lease / rental agreement</SelectItem>
                    <SelectItem value="other">Other documentation</SelectItem>
                    <SelectItem value="none">No proof available</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
        </SectionCard>

        {/* ── Section 2: Company Gmail ─────────────────────── */}
        <SectionCard title="Company Gmail">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="assignedGmail" className="flex w-full items-center gap-1.5">
                Gmail Address
                {autoFilledFields.has('assignedGmail') && <AutoFilledBadge />}
                {suggestedGmail && (
                  <button type="button" onClick={() => onChange('assignedGmail', suggestedGmail)} className="ml-auto truncate max-w-[55%] text-[10px] text-muted-foreground/60 hover:text-primary transition-colors" title="Click to use this suggestion" data-testid="gmail-suggestion">
                    {suggestedGmail}
                  </button>
                )}
              </FieldLabel>
              <Input
                id="assignedGmail"
                type="email"
                value={(formData.assignedGmail as string) || ''}
                onChange={(e) => onChange('assignedGmail', e.target.value)}
                placeholder="assigned@gmail.com"
                data-testid="client-assigned-gmail"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="gmailPassword" className="flex w-full items-center gap-1.5">
                Gmail Password
                {autoFilledFields.has('gmailPassword') && <AutoFilledBadge />}
                {suggestedGmailPassword && (
                  <button type="button" onClick={() => onChange('gmailPassword', suggestedGmailPassword)} className="ml-auto truncate max-w-[55%] text-[10px] text-muted-foreground/60 hover:text-primary transition-colors" title="Click to use this suggestion" data-testid="gmail-pw-suggestion">
                    {suggestedGmailPassword}
                  </button>
                )}
              </FieldLabel>
              <Input
                id="gmailPassword"
                value={(formData.gmailPassword as string) || ''}
                onChange={(e) => onChange('gmailPassword', e.target.value)}
                placeholder="Password"
                data-testid="client-gmail-password"
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Gmail Registration Screenshot</span>
              <UploadTooltip tip={UPLOAD_TIPS.gmail} />
            </div>
            {(formData.gmailScreenshot as string) ? (
              <div className="flex items-center gap-3">
                <ScreenshotThumbnail
                  src={formData.gmailScreenshot as string}
                  onDelete={() => onChange('gmailScreenshot', '')}
                />
                {gmailDetecting && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Detecting Gmail info...
                  </span>
                )}
              </div>
            ) : (
              <UploadDropzone
                onUpload={handleGmailScreenshotUpload}
                data-testid="gmail-screenshot-dropzone"
              />
            )}
          </div>
        </SectionCard>

        {/* ── Section 3: BetMGM Verification ───────────────── */}
        <SectionCard title="BetMGM Verification">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="betmgmLogin" className="flex items-center gap-1.5">
                BetMGM Login Email
                {autoFilledFields.has('betmgmLogin') && <AutoFilledBadge />}
              </FieldLabel>
              <Input
                id="betmgmLogin"
                type="email"
                value={(formData.betmgmLogin as string) || ''}
                onChange={(e) => onChange('betmgmLogin', e.target.value)}
                placeholder="betmgm@email.com"
                data-testid="client-betmgm-login"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="betmgmPassword" className="flex w-full items-center gap-1.5">
                BetMGM Password
                {autoFilledFields.has('betmgmPassword') && <AutoFilledBadge />}
                {suggestedBetmgmPassword && (
                  <button type="button" onClick={() => onChange('betmgmPassword', suggestedBetmgmPassword)} className="ml-auto truncate max-w-[55%] text-[10px] text-muted-foreground/60 hover:text-primary transition-colors" title="Click to use this suggestion" data-testid="betmgm-pw-suggestion">
                    {suggestedBetmgmPassword}
                  </button>
                )}
              </FieldLabel>
              <Input
                id="betmgmPassword"
                value={(formData.betmgmPassword as string) || ''}
                onChange={(e) => onChange('betmgmPassword', e.target.value)}
                placeholder="Password"
                data-testid="client-betmgm-password"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Registration Screenshot</span>
                <UploadTooltip tip={UPLOAD_TIPS.betmgmReg} />
              </div>
              {(formData.betmgmRegScreenshot as string) ? (
                <div className="flex items-center gap-3">
                  <ScreenshotThumbnail
                    src={formData.betmgmRegScreenshot as string}
                    onDelete={() => onChange('betmgmRegScreenshot', '')}
                  />
                  {betmgmDetecting === 'reg' && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analyzing...
                    </span>
                  )}
                </div>
              ) : (
                <UploadDropzone
                  onUpload={makeBetmgmUploadHandler('betmgmRegScreenshot', 'registration')}
                  data-testid="betmgm-reg-screenshot-dropzone"
                />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Login Credentials Screenshot</span>
                <UploadTooltip tip={UPLOAD_TIPS.betmgmLogin} />
              </div>
              {(formData.betmgmLoginScreenshot as string) ? (
                <div className="flex items-center gap-3">
                  <ScreenshotThumbnail
                    src={formData.betmgmLoginScreenshot as string}
                    onDelete={() => onChange('betmgmLoginScreenshot', '')}
                  />
                  {betmgmDetecting === 'login' && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analyzing...
                    </span>
                  )}
                </div>
              ) : (
                <UploadDropzone
                  onUpload={makeBetmgmUploadHandler('betmgmLoginScreenshot', 'login')}
                  data-testid="betmgm-login-screenshot-dropzone"
                />
              )}
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
            <Input
              id="phone"
              value={(formData.phone as string) || ''}
              onChange={(e) => onChange('phone', e.target.value)}
              placeholder="(555) 000-0000"
              data-testid="client-phone"
            />
          </Field>
        </SectionCard>

        {/* ID Detection Modal */}
        {detectionData && (
          <IdDetectionModal
            open={showDetectionModal}
            onOpenChange={setShowDetectionModal}
            data={detectionData}
            onConfirm={handleDetectionConfirm}
          />
        )}

        {/* Gmail Detection Modal */}
        {gmailDetectionData && (
          <GmailDetectionModal
            open={showGmailModal}
            onOpenChange={setShowGmailModal}
            data={gmailDetectionData}
            onConfirm={handleGmailDetectionConfirm}
          />
        )}

        {/* BetMGM Detection Modal */}
        {betmgmDetectionData && (
          <BetmgmDetectionModal
            open={showBetmgmModal}
            onOpenChange={setShowBetmgmModal}
            data={betmgmDetectionData}
            screenshotType={betmgmDetectionType}
            onConfirm={handleBetmgmDetectionConfirm}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
