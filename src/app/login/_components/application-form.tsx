'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Upload,
  X,
  ScanLine,
} from 'lucide-react'
import { step1Schema, step2Schema, step3Schema } from '@/lib/validations/agent-application'
import { submitAgentApplication } from '@/app/actions/agent-application'

type FormErrors = Record<string, string[]>

const STEPS = [
  { label: 'Account', number: 1 },
  { label: 'Identity', number: 2 },
  { label: 'Details', number: 3 },
]

const LEGAL_STATUSES = [
  { value: 'us_citizen', label: 'US Citizen' },
  { value: 'greencard_holder', label: 'Greencard Holder' },
  { value: 'non_us_citizen', label: 'Non-US Citizen' },
]

/** Placeholder — replace with real OCR service later. */
function mockExtractFromId(): Record<string, string> {
  return {
    firstName: 'John',
    lastName: 'Smith',
    dateOfBirth: '1994-01-11',
    idExpiry: '2028-06-15',
    address: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62704',
  }
}

/** Convert ISO date (YYYY-MM-DD) to display format (YYYY/MM/DD). */
function isoToDobDisplay(iso: string): string {
  const digits = iso.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`
  }
  return ''
}

/** Format a raw digit string into YYYY/MM/DD as the user types. */
function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`
}

/** Convert display value (YYYY/MM/DD) to ISO date string (YYYY-MM-DD). */
function dobDisplayToIso(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  }
  return ''
}

/** Small badge shown next to auto-filled fields. */
function AutoFillBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium ml-1">
      <ScanLine className="h-2.5 w-2.5" />
      ID
    </span>
  )
}

export function ApplicationForm() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [globalError, setGlobalError] = useState('')

  const [dobDisplay, setDobDisplay] = useState('')

  // Track which fields were auto-filled from ID
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())


  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: '',
    citizenship: '',
    idExpiry: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    zelle: '',
    referredByName: '',
  })

  // ID document upload
  const [idFile, setIdFile] = useState<File | null>(null)
  const [idPreview, setIdPreview] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState(false)
  const [idDocumentPath, setIdDocumentPath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Address proof upload
  const [addressPreview, setAddressPreview] = useState<string | null>(null)
  const [uploadingAddress, setUploadingAddress] = useState(false)
  const [addressDocumentPath, setAddressDocumentPath] = useState<string | null>(null)
  const addressFileInputRef = useRef<HTMLInputElement>(null)

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear auto-filled indicator when user manually edits
    if (autoFilledFields.has(field)) {
      setAutoFilledFields((prev) => {
        const next = new Set(prev)
        next.delete(field)
        return next
      })
    }
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDobInput(e.target.value)
    setDobDisplay(formatted)
    updateField('dateOfBirth', dobDisplayToIso(formatted))
  }


  const handleNext = () => {
    setErrors({})
    setStep((s) => Math.min(s + 1, 3))
  }

  const handleBack = () => {
    setErrors({})
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        idDocument: ['Only JPG, PNG, and WebP files are allowed'],
      }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        idDocument: ['File must be under 5MB'],
      }))
      return
    }

    setIdFile(file)
    setIdPreview(URL.createObjectURL(file))
    setErrors((prev) => {
      const next = { ...prev }
      delete next.idDocument
      return next
    })

    setUploadingId(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/public', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setIdDocumentPath(data.url)

        // Mock OCR: auto-fill fields from ID
        const extracted = mockExtractFromId()
        const filledKeys = new Set<string>()

        setFormData((prev) => {
          const updated = { ...prev }
          for (const [key, value] of Object.entries(extracted)) {
            if (key in updated) {
              ;(updated as Record<string, string>)[key] = value
              filledKeys.add(key)
            }
          }
          return updated
        })

        // Sync DOB display
        if (extracted.dateOfBirth) {
          setDobDisplay(isoToDobDisplay(extracted.dateOfBirth))
        }

        setAutoFilledFields(filledKeys)
      } else {
        setErrors((prev) => ({
          ...prev,
          idDocument: [data.error || 'Upload failed'],
        }))
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        idDocument: ['Upload failed. Please try again.'],
      }))
    } finally {
      setUploadingId(false)
    }
  }

  const removeFile = () => {
    setIdFile(null)
    setIdPreview(null)
    setIdDocumentPath(null)
    setAutoFilledFields(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAddressFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        addressDocument: ['Only JPG, PNG, and WebP files are allowed'],
      }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        addressDocument: ['File must be under 5MB'],
      }))
      return
    }

    setAddressPreview(URL.createObjectURL(file))
    setErrors((prev) => {
      const next = { ...prev }
      delete next.addressDocument
      return next
    })

    setUploadingAddress(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/public', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setAddressDocumentPath(data.url)
      } else {
        setErrors((prev) => ({
          ...prev,
          addressDocument: [data.error || 'Upload failed'],
        }))
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        addressDocument: ['Upload failed. Please try again.'],
      }))
    } finally {
      setUploadingAddress(false)
    }
  }

  const removeAddressFile = () => {
    setAddressPreview(null)
    setAddressDocumentPath(null)
    if (addressFileInputRef.current) addressFileInputRef.current.value = ''
  }

  const step1Fields = ['email', 'phone', 'password', 'confirmPassword']
  const step2Fields = ['firstName', 'lastName', 'gender', 'dateOfBirth', 'citizenship', 'idExpiry']
  // step3Fields: address, city, state, zipCode, zelle, referredByName

  const navigateToFirstError = (errorKeys: string[]) => {
    if (errorKeys.some((k) => step1Fields.includes(k))) setStep(1)
    else if (errorKeys.some((k) => step2Fields.includes(k))) setStep(2)
    else setStep(3)
  }

  const handleSubmit = async () => {
    // Validate all steps before submitting
    const allErrors: FormErrors = {}
    for (const schema of [step1Schema, step2Schema, step3Schema]) {
      const result = schema.safeParse(formData)
      if (!result.success) {
        Object.assign(allErrors, result.error.flatten().fieldErrors as FormErrors)
      }
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      navigateToFirstError(Object.keys(allErrors))
      return
    }

    setLoading(true)
    setGlobalError('')

    try {
      const fd = new FormData()
      for (const [key, value] of Object.entries(formData)) {
        if (value) fd.append(key, value)
      }
      if (idDocumentPath) {
        fd.append('idDocument', idDocumentPath)
      }
      if (addressDocumentPath) {
        fd.append('addressDocument', addressDocumentPath)
      }

      const result = await submitAgentApplication(fd)

      if (result.success) {
        setSubmitted(true)
      } else if (result.errors) {
        setErrors(result.errors as FormErrors)
        navigateToFirstError(Object.keys(result.errors))
      } else if ('error' in result && result.error) {
        setGlobalError(result.error as string)
      }
    } catch {
      setGlobalError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6" data-testid="application-success">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
          <CheckCircle className="h-6 w-6 text-success" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Application Submitted!
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          You will be contacted when it is reviewed and approved.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="application-form">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s) => (
          <div key={s.number} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setErrors({}); setStep(s.number) }}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors cursor-pointer hover:ring-2 hover:ring-primary/40 ${
                step === s.number
                  ? 'bg-primary text-primary-foreground'
                  : step > s.number
                    ? 'bg-success/20 text-success'
                    : 'bg-muted text-muted-foreground'
              }`}
              data-testid={`app-step-${s.number}`}
            >
              {step > s.number ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                s.number
              )}
            </button>
            {s.number < 3 && (
              <div
                className={`h-px w-6 ${step > s.number ? 'bg-success' : 'bg-border'}`}
              />
            )}
          </div>
        ))}
      </div>

      {globalError && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive ring-1 ring-destructive/20">
          {globalError}
        </div>
      )}

      {/* Step 1: Account */}
      {step === 1 && (
        <div className="flex flex-col justify-end gap-2.5 min-h-[340px]" data-testid="application-step-1">
          {/* Email */}
          <Field>
            <FieldLabel htmlFor="app-email">Email *</FieldLabel>
            <Input
              id="app-email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="you@example.com"
              data-testid="app-email"
            />
            <FieldError>{errors.email?.[0]}</FieldError>
          </Field>

          {/* Password */}
          <Field>
            <FieldLabel htmlFor="app-password">Password *</FieldLabel>
            <Input
              id="app-password"
              type="password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Min 8 characters"
              data-testid="app-password"
            />
            <FieldError>{errors.password?.[0]}</FieldError>
          </Field>

          {/* Confirm Password */}
          <Field>
            <FieldLabel htmlFor="app-confirm-password">Confirm Password *</FieldLabel>
            <Input
              id="app-confirm-password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              placeholder="Re-enter password"
              data-testid="app-confirm-password"
            />
            <FieldError>{errors.confirmPassword?.[0]}</FieldError>
          </Field>

          {/* Phone */}
          <Field>
            <FieldLabel htmlFor="app-phone">Phone *</FieldLabel>
            <Input
              id="app-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(555) 123-4567"
              data-testid="app-phone"
            />
            <FieldError>{errors.phone?.[0]}</FieldError>
          </Field>
        </div>
      )}

      {/* Step 2: Identity */}
      {step === 2 && (
        <div className="space-y-2.5 min-h-[340px]" data-testid="application-step-2">
          {/* ID Upload */}
          <Field>
            <FieldLabel>ID Document</FieldLabel>
            {idPreview ? (
              <div className="relative rounded-md border border-border overflow-hidden">
                <img
                  src={idPreview}
                  alt="ID preview"
                  className="h-20 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
                  data-testid="remove-id-doc"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {uploadingId && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-16 w-full items-center justify-center rounded-md border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                data-testid="upload-id-doc"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  Upload ID (JPG, PNG, WebP)
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <FieldError>{errors.idDocument?.[0]}</FieldError>
          </Field>

          {/* First Name / Last Name */}
          <div className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor="firstName">
                First Name *
                {autoFilledFields.has('firstName') && <AutoFillBadge />}
              </FieldLabel>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="John"
                data-testid="app-first-name"
              />
              <FieldError>{errors.firstName?.[0]}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">
                Last Name *
                {autoFilledFields.has('lastName') && <AutoFillBadge />}
              </FieldLabel>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Smith"
                data-testid="app-last-name"
              />
              <FieldError>{errors.lastName?.[0]}</FieldError>
            </Field>
          </div>

          {/* Gender / DOB */}
          <div className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor="app-gender">Gender</FieldLabel>
              <Select
                value={formData.gender}
                onValueChange={(v) => updateField('gender', v)}
              >
                <SelectTrigger id="app-gender" data-testid="app-gender">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="app-dob">
                Date of Birth
                {autoFilledFields.has('dateOfBirth') && <AutoFillBadge />}
              </FieldLabel>
              <Input
                id="app-dob"
                value={dobDisplay}
                onChange={handleDobChange}
                placeholder="YYYY/MM/DD"
                inputMode="numeric"
                maxLength={10}
                data-testid="app-dob"
              />
            </Field>
          </div>

          {/* Legal Status / ID Expiry */}
          <div className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor="app-citizenship">Legal Status *</FieldLabel>
              <Select
                value={formData.citizenship}
                onValueChange={(v) => updateField('citizenship', v)}
              >
                <SelectTrigger id="app-citizenship" data-testid="app-citizenship">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.citizenship?.[0]}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="app-id-expiry">
                ID Expiry
                {autoFilledFields.has('idExpiry') && <AutoFillBadge />}
              </FieldLabel>
              <Input
                id="app-id-expiry"
                type="date"
                value={formData.idExpiry}
                onChange={(e) => updateField('idExpiry', e.target.value)}
                data-testid="app-id-expiry"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="space-y-2.5 min-h-[340px]" data-testid="application-step-3">
          {/* Address Proof Upload */}
          <Field>
            <FieldLabel>Address Proof</FieldLabel>
            {addressPreview ? (
              <div className="relative rounded-md border border-border overflow-hidden">
                <img
                  src={addressPreview}
                  alt="Address proof preview"
                  className="h-20 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeAddressFile}
                  className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
                  data-testid="remove-address-doc"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {uploadingAddress && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addressFileInputRef.current?.click()}
                className="flex h-16 w-full items-center justify-center rounded-md border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                data-testid="upload-address-doc"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  Upload proof (JPG, PNG, WebP)
                </div>
              </button>
            )}
            <input
              ref={addressFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAddressFileChange}
              className="hidden"
            />
            <FieldError>{errors.addressDocument?.[0]}</FieldError>
          </Field>

          {/* Address */}
          <Field>
            <FieldLabel htmlFor="app-address">
              Address
              {autoFilledFields.has('address') && <AutoFillBadge />}
            </FieldLabel>
            <Input
              id="app-address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main St"
              data-testid="app-address"
            />
          </Field>

          {/* City / State / Zip */}
          <div className="grid grid-cols-[1fr_60px_80px] gap-2">
            <Field>
              <FieldLabel htmlFor="app-city">
                City
                {autoFilledFields.has('city') && <AutoFillBadge />}
              </FieldLabel>
              <Input
                id="app-city"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Springfield"
                data-testid="app-city"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="app-state">
                State
                {autoFilledFields.has('state') && <AutoFillBadge />}
              </FieldLabel>
              <Input
                id="app-state"
                value={formData.state}
                onChange={(e) => updateField('state', e.target.value)}
                placeholder="IL"
                data-testid="app-state"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="app-zip">
                Zip
                {autoFilledFields.has('zipCode') && <AutoFillBadge />}
              </FieldLabel>
              <Input
                id="app-zip"
                value={formData.zipCode}
                onChange={(e) => updateField('zipCode', e.target.value)}
                placeholder="62701"
                data-testid="app-zip"
              />
            </Field>
          </div>

          {/* Zelle / Referred By */}
          <div className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel htmlFor="app-zelle">Zelle</FieldLabel>
              <Input
                id="app-zelle"
                value={formData.zelle}
                onChange={(e) => updateField('zelle', e.target.value)}
                placeholder="zelle@email.com"
                data-testid="app-zelle"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="app-referred-by">Referred By</FieldLabel>
              <Input
                id="app-referred-by"
                value={formData.referredByName}
                onChange={(e) => updateField('referredByName', e.target.value)}
                placeholder="Agent name"
                data-testid="app-referred-by"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1">
        {step > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1"
            data-testid="app-back-btn"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            type="button"
            size="sm"
            onClick={handleNext}
            className="gap-1"
            data-testid="app-next-btn"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className="btn-glow gap-1 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30"
            data-testid="app-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
