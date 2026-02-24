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

function MultiCheckDropdown({
  label,
  selected,
  onChange,
  testId,
}: {
  label: string
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
          .map((v) => BANK_OPTIONS.find((b) => b.value === v)?.label ?? v)
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
          {BANK_OPTIONS.map((bank) => (
            <label
              key={bank.value}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(bank.value)}
                onCheckedChange={() => toggle(bank.value)}
              />
              {bank.label}
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

        {/* Background — SSN, Secondary Address Proof, Criminal Record */}
        <SectionCard title="Background">
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
                <FieldLabel htmlFor="missingIdType">Missing ID Type</FieldLabel>
                <Select
                  value={(formData.missingIdType as string) || ''}
                  onValueChange={(value) => onChange('missingIdType', value)}
                >
                  <SelectTrigger id="missingIdType" data-testid="client-missing-id-type">
                    <SelectValue placeholder="Select missing ID" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (has all IDs)</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="state_id">State ID</SelectItem>
                    <SelectItem value="drivers_license">Driver&apos;s License</SelectItem>
                    <SelectItem value="passport_state_id">Passport + State ID</SelectItem>
                    <SelectItem value="passport_drivers_license">Passport + Driver&apos;s License</SelectItem>
                    <SelectItem value="state_id_drivers_license">State ID + Driver&apos;s License</SelectItem>
                  </SelectContent>
                </Select>
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
              <FieldLabel>Banks De-banked</FieldLabel>
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

            {/* Follow-up: SSN linked? */}
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
          </div>

          <Field>
            <FieldLabel htmlFor="sportsbookHistory">Sportsbook History</FieldLabel>
            <Select
              value={(formData.sportsbookHistory as string) || ''}
              onValueChange={(value) => onChange('sportsbookHistory', value)}
            >
              <SelectTrigger id="sportsbookHistory" data-testid="client-sportsbook-history">
                <SelectValue placeholder="Select sportsbook history" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Prior Accounts</SelectItem>
                <SelectItem value="some">Some Prior Accounts</SelectItem>
                <SelectItem value="many">Many Prior Accounts</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </SectionCard>

        {/* Risk Flags */}
        <SectionCard title="Risk Flags">
          <div className="flex items-center gap-2">
            <Checkbox
              id="undisclosedInfo"
              checked={formData.undisclosedInfo as boolean}
              onCheckedChange={(checked) => {
                const val = checked === true
                onChange('undisclosedInfo', val)
                onRiskFlagsChange({ undisclosedInfo: val })
              }}
              data-testid="flag-undisclosed"
            />
            <label htmlFor="undisclosedInfo" className="text-sm font-medium">
              Undisclosed Information
            </label>
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
