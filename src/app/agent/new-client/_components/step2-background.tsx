'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { UploadDropzone, ScreenshotThumbnail } from '@/components/upload-dropzone'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronDown, HelpCircle, Loader2, ScanLine, ChevronsUpDown } from 'lucide-react'
import {
  mockExtractFromSsn,
  mockExtractFromAddressProof,
  type SsnExtractionResult,
  type AddressProofExtractionResult,
} from './mock-extract-id'
import { SsnDetectionModal } from './ssn-detection-modal'
import { AddressDetectionModal } from './address-detection-modal'

interface Step2Props {
  formData: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  onRiskFlagsChange: (flags: Record<string, unknown>) => void
}

const UPLOAD_TIPS = {
  ssn: {
    what: 'Social Security card or official SSN document',
    not: 'Driver\'s license, passport, or other non-SSN documents',
  },
  addressProof: {
    what: 'Bank statement, utility bill, or lease showing the secondary address',
    not: 'Documents showing the primary/ID address',
  },
} as const

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

const BANK_OPTIONS = [
  { value: 'chase', label: 'Chase' },
  { value: 'citi', label: 'Citi' },
  { value: 'bofa', label: 'Bank of America' },
  { value: 'wells_fargo', label: 'Wells Fargo' },
  { value: 'td_bank', label: 'TD Bank' },
  { value: 'capital_one', label: 'Capital One' },
  { value: 'us_bank', label: 'U.S. Bank' },
  { value: 'pnc', label: 'PNC' },
] as const

const MISSING_ID_OPTIONS = [
  { value: 'passport', label: 'Passport' },
  { value: 'state_id', label: 'State ID' },
  { value: 'drivers_license', label: "Driver's License" },
] as const

const SPORTSBOOK_OPTIONS = [
  { value: 'draftkings', label: 'DraftKings' },
  { value: 'fanduel', label: 'FanDuel' },
  { value: 'betmgm', label: 'BetMGM' },
  { value: 'caesars', label: 'Caesars' },
  { value: 'fanatics', label: 'Fanatics' },
  { value: 'ballybet', label: 'Bally Bet' },
  { value: 'betrivers', label: 'BetRivers' },
  { value: 'bet365', label: 'Bet365' },
] as const

function MultiCheckDropdown({
  label,
  options = BANK_OPTIONS as unknown as readonly { value: string; label: string }[],
  selected,
  onChange,
  testId,
}: {
  label: string
  options?: readonly { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  testId: string
}) {
  const [open, setOpen] = useState(false)

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const displayText =
    selected.length === 0
      ? label
      : selected
          .map((v) => options.find((o) => o.value === v)?.label ?? v)
          .join(', ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 text-sm"
          data-testid={testId}
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SectionCard({
  title,
  extra,
  children,
  defaultOpen,
}: {
  title: string
  extra?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
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

function parseBankList(value: string | undefined | null): string[] {
  if (!value) return []
  return value.split(',').filter(Boolean)
}

function parseSportsbookList(value: string | undefined | null): string[] {
  if (!value) return []
  return value.split(',').filter(Boolean)
}

function parseSportsbookStatuses(value: string | undefined | null): Record<string, string> {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function serializeSportsbookStatuses(statuses: Record<string, string>): string {
  return JSON.stringify(statuses)
}

function SportsbookMultiCheckDropdown({
  selected,
  onChange,
  testId,
}: {
  selected: string[]
  onChange: (values: string[]) => void
  testId: string
}) {
  const [open, setOpen] = useState(false)

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const displayText =
    selected.length === 0
      ? 'Select sportsbooks'
      : selected
            .map((v) => SPORTSBOOK_OPTIONS.find((s) => s.value === v)?.label ?? v)
            .join(', ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 text-sm"
          data-testid={testId}
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <div className="space-y-1">
          {SPORTSBOOK_OPTIONS.map((sb) => (
            <label
              key={sb.value}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(sb.value)}
                onCheckedChange={() => toggle(sb.value)}
              />
              {sb.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function Step2Background({ formData, onChange, onRiskFlagsChange }: Step2Props) {
  // SSN detection state
  const [ssnDetecting, setSsnDetecting] = useState(false)
  const [ssnDetectionData, setSsnDetectionData] = useState<SsnExtractionResult | null>(null)
  const [showSsnModal, setShowSsnModal] = useState(false)
  const [ssnAutoFilled, setSsnAutoFilled] = useState(false)

  // Address proof detection state
  const [addressDetecting, setAddressDetecting] = useState(false)
  const [addressDetectionData, setAddressDetectionData] = useState<AddressProofExtractionResult | null>(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [addressAutoFilled, setAddressAutoFilled] = useState(false)

  const livesAtDifferentAddress = formData.livesAtDifferentAddress as boolean

  // SSN upload with detection
  const handleSsnUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (!res.ok) return { success: false, error: data.error ?? 'Upload failed' }

        onChange('ssnDocument', data.url)

        // Trigger OCR detection
        setSsnDetecting(true)
        try {
          const extracted = await mockExtractFromSsn(file)
          setSsnDetectionData(extracted)
          setShowSsnModal(true)
        } finally {
          setSsnDetecting(false)
        }

        return { success: true }
      } catch {
        return { success: false, error: 'Upload failed' }
      }
    },
    [onChange],
  )

  function handleSsnDetectionConfirm(ssnNumber: string) {
    onChange('ssnNumber', ssnNumber)
    setSsnAutoFilled(true)
  }

  // Address proof upload with detection
  const handleAddressProofUpload = useCallback(
    async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      try {
        const res = await fetch('/api/upload/public', { method: 'POST', body })
        const data = await res.json()
        if (!res.ok) return { success: false, error: data.error ?? 'Upload failed' }

        onChange('secondAddressProof', data.url)

        // Trigger OCR detection
        setAddressDetecting(true)
        try {
          const extracted = await mockExtractFromAddressProof(file)
          setAddressDetectionData(extracted)
          setShowAddressModal(true)
        } finally {
          setAddressDetecting(false)
        }

        return { success: true }
      } catch {
        return { success: false, error: 'Upload failed' }
      }
    },
    [onChange],
  )

  function handleAddressDetectionConfirm(address: string) {
    onChange('secondAddress', address)
    setAddressAutoFilled(true)
  }

  return (
    <TooltipProvider>
      <div className="space-y-4" data-testid="step2-background">

        {/* Identity & Document — SSN, Secondary Address Proof, Criminal Record */}
        <SectionCard title="Identity & Document">
          {/* SSN Document */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">SSN Document</span>
              <UploadTooltip tip={UPLOAD_TIPS.ssn} />
            </div>
            {(formData.ssnDocument as string) ? (
              <div className="flex items-center gap-3">
                <ScreenshotThumbnail
                  src={formData.ssnDocument as string}
                  onDelete={() => {
                    onChange('ssnDocument', '')
                    setSsnAutoFilled(false)
                  }}
                />
                {ssnDetecting && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Detecting SSN...
                  </span>
                )}
              </div>
            ) : (
              <UploadDropzone
                onUpload={handleSsnUpload}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                data-testid="ssn-upload-dropzone"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="ssnNumber" className="flex items-center gap-1.5">
                  SSN Number
                  {ssnAutoFilled && <AutoFilledBadge />}
                </FieldLabel>
                <Input
                  id="ssnNumber"
                  value={(formData.ssnNumber as string) || ''}
                  onChange={(e) => onChange('ssnNumber', e.target.value)}
                  placeholder="000-00-0000"
                  data-testid="client-ssn-number"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="citizenship">Citizenship</FieldLabel>
                <Select
                  value={(formData.citizenship as string) || ''}
                  onValueChange={(value) => onChange('citizenship', value)}
                >
                  <SelectTrigger id="citizenship" data-testid="client-citizenship">
                    <SelectValue placeholder="Select citizenship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us_citizen">U.S. Citizen</SelectItem>
                    <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                    <SelectItem value="visa_holder">Visa Holder</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Missing ID Type</FieldLabel>
                <MultiCheckDropdown
                  label="None (has all IDs)"
                  options={MISSING_ID_OPTIONS}
                  selected={parseBankList(formData.missingIdType as string)}
                  onChange={(values) => {
                    onChange('missingIdType', values.join(','))
                    onRiskFlagsChange({ missingIdCount: values.length })
                  }}
                  testId="client-missing-id-type"
                />
              </Field>
            </div>

          {/* Multiple Addresses */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="multipleAddresses"
                checked={formData.livesAtDifferentAddress as boolean}
                onCheckedChange={(checked) => {
                  const val = checked === true
                  onChange('livesAtDifferentAddress', val)
                  onChange('addressMismatch', val)
                  onRiskFlagsChange({ multipleAddresses: val })
                  if (!val) {
                    onChange('secondAddress', '')
                    onChange('secondAddressProof', '')
                    onChange('currentAddress', '')
                    onChange('differentAddressDuration', '')
                    onChange('differentAddressProof', '')
                    setAddressAutoFilled(false)
                  }
                }}
                data-testid="flag-multiple-addresses"
              />
              <label htmlFor="multipleAddresses" className="text-sm font-medium">
                Client has multiple addresses
              </label>
              {(formData.livesAtDifferentAddress as boolean) && <UploadTooltip tip={UPLOAD_TIPS.addressProof} />}
            </div>

            {(formData.livesAtDifferentAddress as boolean) && (
              <div className="mt-3 space-y-4 rounded-md border p-4">
                {(formData.secondAddressProof as string) ? (
                  <div className="flex items-center gap-3">
                    <ScreenshotThumbnail
                      src={formData.secondAddressProof as string}
                      onDelete={() => {
                        onChange('secondAddressProof', '')
                        setAddressAutoFilled(false)
                      }}
                    />
                    {addressDetecting && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Detecting address...
                      </span>
                    )}
                  </div>
                ) : (
                  <UploadDropzone
                    onUpload={handleAddressProofUpload}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    data-testid="address-proof-upload-dropzone"
                  />
                )}
                <Field>
                  <FieldLabel htmlFor="secondAddress" className="flex items-center gap-1.5">
                    Secondary Address
                    {addressAutoFilled && <AutoFilledBadge />}
                  </FieldLabel>
                  <Input
                    id="secondAddress"
                    value={(formData.secondAddress as string) || ''}
                    onChange={(e) => onChange('secondAddress', e.target.value)}
                    placeholder="Enter or correct the secondary address"
                    data-testid="client-second-address-text"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Criminal Record */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hasCriminalRecord"
                checked={formData.hasCriminalRecord as boolean}
                onCheckedChange={(checked) => {
                  const val = checked === true
                  onChange('hasCriminalRecord', val)
                  onRiskFlagsChange({ criminalRecord: val })
                }}
                data-testid="client-criminal-record"
              />
              <label htmlFor="hasCriminalRecord" className="text-sm font-medium">
                Client has a criminal record
              </label>
            </div>

            {(formData.hasCriminalRecord as boolean) && (
              <Field>
                <FieldLabel htmlFor="criminalRecordNotes">Details</FieldLabel>
                <Textarea
                  id="criminalRecordNotes"
                  value={(formData.criminalRecordNotes as string) || ''}
                  onChange={(e) => onChange('criminalRecordNotes', e.target.value)}
                  placeholder="Describe the criminal record..."
                  rows={3}
                  data-testid="client-criminal-notes"
                />
              </Field>
            )}
          </div>
        </SectionCard>

        {/* Platforms History */}
        <SectionCard title="Platforms History">
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Banks Opened</FieldLabel>
              <MultiCheckDropdown
                label="Select banks"
                selected={parseBankList(formData.bankingHistory as string)}
                onChange={(values) => onChange('bankingHistory', values.join(','))}
                testId="client-banks-opened"
              />
            </Field>
            <Field>
              <FieldLabel className="flex items-center gap-1.5">
                Banks De-banked
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-left">
                    De-banked means the bank terminated the account involuntarily. Accounts the client chose to close do not count.
                  </TooltipContent>
                </Tooltip>
              </FieldLabel>
              <MultiCheckDropdown
                label="Select banks"
                selected={parseBankList(formData.debankedBank as string)}
                onChange={(values) => {
                  const joined = values.join(',')
                  onChange('debankedBank', joined)
                  const hasDebanked = values.length > 0
                  onChange('debankedHistory', hasDebanked)
                  onRiskFlagsChange({ debankedHistory: hasDebanked })
                }}
                testId="client-banks-debanked"
              />
            </Field>
          </div>

          {/* PayPal */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Has client used PayPal before?</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={formData.paypalPreviouslyUsed === true}
                  onCheckedChange={() => {
                    onChange('paypalPreviouslyUsed', true)
                    onRiskFlagsChange({ paypalPreviouslyUsed: true })
                  }}
                  className="rounded-full"
                  data-testid="paypal-used-yes"
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={formData.paypalPreviouslyUsed === false}
                  onCheckedChange={() => {
                    onChange('paypalPreviouslyUsed', false)
                    onChange('paypalSsnLinked', false)
                    onChange('paypalBrowserVerified', false)
                    onRiskFlagsChange({ paypalPreviouslyUsed: false })
                  }}
                  className="rounded-full"
                  data-testid="paypal-used-no"
                />
                No
              </label>
            </div>

            {/* Follow-up: SSN linked? (only when Yes) */}
            {(formData.paypalPreviouslyUsed as boolean) && (
              <div className="mt-3 rounded-md border p-4 space-y-3">
                <div>
                  <span className="text-sm font-medium">Has client linked SSN with PayPal?</span>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={formData.paypalSsnLinked === true}
                        onCheckedChange={() => {
                          onChange('paypalSsnLinked', true)
                          onChange('paypalBrowserVerified', true)
                        }}
                        className="rounded-full"
                        data-testid="paypal-ssn-yes"
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={formData.paypalSsnLinked === false}
                        onCheckedChange={() => {
                          onChange('paypalSsnLinked', false)
                          onChange('paypalBrowserVerified', false)
                        }}
                        className="rounded-full"
                        data-testid="paypal-ssn-no"
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* Guidance based on answer */}
                {(formData.paypalSsnLinked as boolean) && (
                  <div className="rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-700 dark:text-green-400" data-testid="paypal-verified-note">
                    Logged into existing PayPal via web browser (not app) to verify.
                  </div>
                )}
                {formData.paypalSsnLinked === false && (
                  <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-400" data-testid="paypal-create-note">
                    Create a new PayPal account using company Gmail and link client&apos;s SSN.
                  </div>
                )}
              </div>
            )}

            {/* Guidance when PayPal = No */}
            {formData.paypalPreviouslyUsed === false && (
              <div className="mt-3 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-400" data-testid="paypal-no-create-note">
                Create a new PayPal account using company Gmail and link client&apos;s SSN.
              </div>
            )}
          </div>

          {/* Sportsbook History */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Has client used any of the 8 sportsbooks?</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={formData.sportsbookUsedBefore === true}
                  onCheckedChange={() => {
                    onChange('sportsbookUsedBefore', true)
                  }}
                  className="rounded-full"
                  data-testid="sportsbook-used-yes"
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={formData.sportsbookUsedBefore === false}
                  onCheckedChange={() => {
                    onChange('sportsbookUsedBefore', false)
                    onChange('sportsbookUsedList', '')
                    onChange('sportsbookStatuses', '')
                  }}
                  className="rounded-full"
                  data-testid="sportsbook-used-no"
                />
                No
              </label>
            </div>

            {(formData.sportsbookUsedBefore as boolean) && (
              <div className="mt-3 space-y-4 rounded-md border p-4">
                <Field>
                  <FieldLabel>Which sportsbooks?</FieldLabel>
                  <SportsbookMultiCheckDropdown
                    selected={parseSportsbookList(formData.sportsbookUsedList as string)}
                    onChange={(values) => {
                      onChange('sportsbookUsedList', values.join(','))
                      // Clean up statuses for removed sportsbooks
                      const statuses = parseSportsbookStatuses(formData.sportsbookStatuses as string)
                      const cleaned = Object.fromEntries(
                        Object.entries(statuses).filter(([k]) => values.includes(k))
                      )
                      onChange('sportsbookStatuses', serializeSportsbookStatuses(cleaned))
                    }}
                    testId="client-sportsbook-list"
                  />
                </Field>

                {/* Status per selected sportsbook */}
                {parseSportsbookList(formData.sportsbookUsedList as string).length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Status for each sportsbook</span>
                    <div className="grid grid-cols-2 gap-2">
                      {parseSportsbookList(formData.sportsbookUsedList as string).map((sb) => {
                        const statuses = parseSportsbookStatuses(formData.sportsbookStatuses as string)
                        const currentStatus = statuses[sb] || ''
                        return (
                          <div key={sb} className="flex items-center gap-2">
                            <span className="text-sm min-w-[90px]">{SPORTSBOOK_OPTIONS.find((o) => o.value === sb)?.label ?? sb}</span>
                            <Select
                              value={currentStatus}
                              onValueChange={(val) => {
                                const updated = { ...statuses, [sb]: val }
                                onChange('sportsbookStatuses', serializeSportsbookStatuses(updated))
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs" data-testid={`sportsbook-status-${sb}`}>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lost_money">Lost money</SelectItem>
                                <SelectItem value="won_money">Won money</SelectItem>
                                <SelectItem value="idk">IDK</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Client Background */}
        <SectionCard title="Client Background">
          <div className="grid grid-cols-3 gap-4">
            <Field>
              <FieldLabel htmlFor="occupation">Occupation</FieldLabel>
              <Input
                id="occupation"
                value={(formData.occupation as string) || ''}
                onChange={(e) => onChange('occupation', e.target.value)}
                placeholder="e.g. Software Engineer"
                data-testid="client-occupation"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="annualIncome">Annual Income</FieldLabel>
              <Select
                value={(formData.annualIncome as string) || ''}
                onValueChange={(value) => onChange('annualIncome', value)}
              >
                <SelectTrigger id="annualIncome" data-testid="client-annual-income">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_25k">Under $25,000</SelectItem>
                  <SelectItem value="25k_50k">$25,000 – $50,000</SelectItem>
                  <SelectItem value="50k_75k">$50,000 – $75,000</SelectItem>
                  <SelectItem value="75k_100k">$75,000 – $100,000</SelectItem>
                  <SelectItem value="100k_150k">$100,000 – $150,000</SelectItem>
                  <SelectItem value="150k_plus">$150,000+</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="employmentStatus">Employment Status</FieldLabel>
              <Select
                value={(formData.employmentStatus as string) || ''}
                onValueChange={(value) => onChange('employmentStatus', value)}
              >
                <SelectTrigger id="employmentStatus" data-testid="client-employment-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="self_employed">Self-employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Field>
              <FieldLabel htmlFor="maritalStatus">Marital Status</FieldLabel>
              <Select
                value={(formData.maritalStatus as string) || ''}
                onValueChange={(value) => onChange('maritalStatus', value)}
              >
                <SelectTrigger id="maritalStatus" data-testid="client-marital-status">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="creditScoreRange">Credit Score</FieldLabel>
              <Select
                value={(formData.creditScoreRange as string) || ''}
                onValueChange={(value) => onChange('creditScoreRange', value)}
              >
                <SelectTrigger id="creditScoreRange" data-testid="client-credit-score">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent (750+)</SelectItem>
                  <SelectItem value="good">Good (700–749)</SelectItem>
                  <SelectItem value="fair">Fair (650–699)</SelectItem>
                  <SelectItem value="poor">Poor (&lt;650)</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="dependents">Dependents</FieldLabel>
              <Select
                value={(formData.dependents as string) || ''}
                onValueChange={(value) => onChange('dependents', value)}
              >
                <SelectTrigger id="dependents" data-testid="client-dependents">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3_plus">3+</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="educationLevel">Education</FieldLabel>
              <Select
                value={(formData.educationLevel as string) || ''}
                onValueChange={(value) => onChange('educationLevel', value)}
              >
                <SelectTrigger id="educationLevel" data-testid="client-education-level">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_school">High School</SelectItem>
                  <SelectItem value="associates">Associate&apos;s</SelectItem>
                  <SelectItem value="bachelors">Bachelor&apos;s</SelectItem>
                  <SelectItem value="masters">Master&apos;s</SelectItem>
                  <SelectItem value="doctorate">Doctorate</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk Assessment Questions</p>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="householdAwareness">Household Awareness & Support</FieldLabel>
                <Select
                  value={(formData.householdAwareness as string) || ''}
                  onValueChange={(value) => {
                    onChange('householdAwareness', value)
                    onRiskFlagsChange({ householdAwareness: value })
                  }}
                >
                  <SelectTrigger id="householdAwareness" data-testid="client-household-awareness">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supportive">Yes, Supportive</SelectItem>
                    <SelectItem value="aware_neutral">Aware but Neutral</SelectItem>
                    <SelectItem value="not_aware">Not Aware</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="familyTechSupport">Family Available for Account Setup</FieldLabel>
                <Select
                  value={(formData.familyTechSupport as string) || ''}
                  onValueChange={(value) => {
                    onChange('familyTechSupport', value)
                    onRiskFlagsChange({ familyTechSupport: value })
                  }}
                >
                  <SelectTrigger id="familyTechSupport" data-testid="client-family-tech-support">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="willing_to_help">Yes, Willing to Help</SelectItem>
                    <SelectItem value="available_uninvolved">Available but Uninvolved</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="prefer_not_to_involve">Prefer Not to Involve</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="financialAutonomy">Financial Decision Autonomy</FieldLabel>
                <Select
                  value={(formData.financialAutonomy as string) || ''}
                  onValueChange={(value) => {
                    onChange('financialAutonomy', value)
                    onRiskFlagsChange({ financialAutonomy: value })
                  }}
                >
                  <SelectTrigger id="financialAutonomy" data-testid="client-financial-autonomy">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_independent">Fully Independent</SelectItem>
                    <SelectItem value="shared_with_spouse">Shared with Spouse</SelectItem>
                    <SelectItem value="dependent_on_others">Dependent on Others</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="digitalComfort">Online Account Management Comfort</FieldLabel>
                <Select
                  value={(formData.digitalComfort as string) || ''}
                  onValueChange={(value) => onChange('digitalComfort', value)}
                >
                  <SelectTrigger id="digitalComfort" data-testid="client-digital-comfort">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_comfortable">Very Comfortable</SelectItem>
                    <SelectItem value="needs_some_guidance">Needs Some Guidance</SelectItem>
                    <SelectItem value="needs_significant_help">Needs Significant Help</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* SSN Detection Modal */}
        {ssnDetectionData && (
          <SsnDetectionModal
            open={showSsnModal}
            onOpenChange={setShowSsnModal}
            data={ssnDetectionData}
            onConfirm={handleSsnDetectionConfirm}
          />
        )}

        {/* Address Detection Modal */}
        {addressDetectionData && (
          <AddressDetectionModal
            open={showAddressModal}
            onOpenChange={setShowAddressModal}
            data={addressDetectionData}
            onConfirm={handleAddressDetectionConfirm}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
