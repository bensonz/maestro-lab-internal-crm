'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface ExtractedData {
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  address?: string
  city?: string
  state?: string
  zip?: string
  idExpiry?: string
}

interface IdUploadSectionProps {
  onDataExtracted: (data: ExtractedData) => void
  onConfirm: () => void
  isConfirmed: boolean
  initialData?: ExtractedData
  onIdUploaded: (url: string) => void
  initialIdUrl?: string
}

export function IdUploadSection({
  onDataExtracted,
  onConfirm,
  isConfirmed,
  initialData,
  onIdUploaded,
  initialIdUrl,
}: IdUploadSectionProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialIdUrl ?? null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(initialData ?? null)
  const [editableData, setEditableData] = useState<ExtractedData | null>(initialData ?? null)
  const [dragActive, setDragActive] = useState(false)
  const [manualExpiry, setManualExpiry] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Simulated OCR - in production this would call an actual OCR API
  const simulateOCR = useCallback(
    async (_file: File): Promise<ExtractedData> => {
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Return simulated extracted data
      return {
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15',
        address: '123 Main Street',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        // OCR may or may not extract expiry — leave undefined to trigger manual entry
      }
    },
    [],
  )

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadedFile(file)
      setIsUploading(true)

      try {
        // Upload file to storage
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'id-document')
        formData.append('entity', 'client')

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          toast.error(data?.error ?? 'Failed to upload ID')
          setUploadedFile(null)
          return
        }

        const { url } = await res.json()
        setUploadedUrl(url)
        onIdUploaded(url)
      } catch {
        toast.error('Failed to upload ID')
        setUploadedFile(null)
        return
      } finally {
        setIsUploading(false)
      }

      // Run OCR simulation after successful upload
      setIsProcessing(true)
      try {
        const data = await simulateOCR(file)
        setExtractedData(data)
        setEditableData(data)
        onDataExtracted(data)
      } catch {
        toast.error('Failed to process ID')
      } finally {
        setIsProcessing(false)
      }
    },
    [simulateOCR, onDataExtracted, onIdUploaded],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)

      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith('image/')) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload],
  )

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null)
    setUploadedUrl(null)
    setExtractedData(null)
    setEditableData(null)
    setManualExpiry('')
    onIdUploaded('')
  }, [onIdUploaded])

  const handleEditableFieldChange = useCallback(
    (field: keyof ExtractedData, value: string) => {
      if (!editableData) return
      const updated = { ...editableData, [field]: value }
      setEditableData(updated)
      onDataExtracted(updated)
    },
    [editableData, onDataExtracted],
  )

  const handleManualExpiryChange = useCallback(
    (value: string) => {
      setManualExpiry(value)
      // Propagate complete dates to parent for risk panel / expiration checks,
      // but do NOT write back into editableData.idExpiry — that would hide
      // this input field (line 481 condition) mid-typing.
      if (editableData && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        onDataExtracted({ ...editableData, idExpiry: value })
      }
    },
    [editableData, onDataExtracted],
  )

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--
    }
    return age
  }

  // Use editableData for display, fall back to extractedData
  const displayData = editableData ?? extractedData

  const age = displayData?.dateOfBirth
    ? calculateAge(displayData.dateOfBirth)
    : null

  // ID expiration check — only validate complete YYYY-MM-DD dates
  // to avoid showing scary banners while the user is still typing
  const idExpiryDate = displayData?.idExpiry || manualExpiry
  const isCompleteDate = idExpiryDate ? /^\d{4}-\d{2}-\d{2}$/.test(idExpiryDate) : false
  const daysUntilExpiry = isCompleteDate
    ? Math.floor(
        (new Date(idExpiryDate).getTime() - Date.now()) / 86400000,
      )
    : null
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0
  const isExpiringSoon =
    daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 75

  return (
    <div className="space-y-4">
      {isConfirmed && (
        <Badge
          variant="outline"
          className="border-success/50 bg-success/10 text-success"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Verified
        </Badge>
      )}
      {!uploadedFile && !initialData && !initialIdUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
            }`}
            data-testid="id-drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              data-testid="id-file-input"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              Drag & drop ID image here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to select a file
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                data-testid="id-browse-btn"
              >
                <FileText className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
              <Button type="button" variant="outline" size="sm" disabled>
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Preview — only when a file was actually uploaded (not for initialData) */}
            {(uploadedFile || uploadedUrl) ? (
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                {uploadedUrl ? (
                  <img
                    src={uploadedUrl}
                    alt="ID preview"
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedFile?.name ?? 'ID Document'}
                  </p>
                  {uploadedFile && (
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              </div>
              {!isConfirmed && !isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            ) : null}

            {/* Uploading State */}
            {isUploading && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary">
                  Uploading ID...
                </span>
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary">
                  Processing ID...
                </span>
              </div>
            )}

            {/* Extracted Data — Editable Fields */}
            {displayData && !isProcessing && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Extracted Information
                  </p>
                  {isConfirmed ? (
                    /* Read-only display after confirmation */
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium text-foreground">
                          {displayData.firstName}{' '}
                          {displayData.middleName &&
                            `${displayData.middleName} `}
                          {displayData.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Date of Birth:
                        </span>
                        <span className="font-medium text-foreground">
                          {displayData.dateOfBirth}
                        </span>
                      </div>
                      {displayData.address && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-medium text-foreground">
                            {displayData.address}, {displayData.city},{' '}
                            {displayData.state} {displayData.zip}
                          </span>
                        </div>
                      )}
                      {displayData.idExpiry && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID Expiry:</span>
                          <span className="font-medium text-foreground">
                            {displayData.idExpiry}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Editable fields before confirmation */
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="extracted-firstName">First Name</FieldLabel>
                        <Input
                          id="extracted-firstName"
                          value={displayData.firstName}
                          onChange={(e) => handleEditableFieldChange('firstName', e.target.value)}
                          data-testid="extracted-first-name"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="extracted-middleName">Middle Name</FieldLabel>
                        <Input
                          id="extracted-middleName"
                          value={displayData.middleName ?? ''}
                          onChange={(e) => handleEditableFieldChange('middleName', e.target.value)}
                          data-testid="extracted-middle-name"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="extracted-lastName">Last Name</FieldLabel>
                        <Input
                          id="extracted-lastName"
                          value={displayData.lastName}
                          onChange={(e) => handleEditableFieldChange('lastName', e.target.value)}
                          data-testid="extracted-last-name"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="extracted-dob">Date of Birth</FieldLabel>
                        <Input
                          id="extracted-dob"
                          type="date"
                          value={displayData.dateOfBirth}
                          onChange={(e) => handleEditableFieldChange('dateOfBirth', e.target.value)}
                          data-testid="extracted-dob"
                        />
                      </Field>
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="extracted-address">Address</FieldLabel>
                        <Input
                          id="extracted-address"
                          value={displayData.address ?? ''}
                          onChange={(e) => handleEditableFieldChange('address', e.target.value)}
                          data-testid="extracted-address"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="extracted-city">City</FieldLabel>
                        <Input
                          id="extracted-city"
                          value={displayData.city ?? ''}
                          onChange={(e) => handleEditableFieldChange('city', e.target.value)}
                          data-testid="extracted-city"
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="extracted-state">State</FieldLabel>
                          <Input
                            id="extracted-state"
                            value={displayData.state ?? ''}
                            onChange={(e) => handleEditableFieldChange('state', e.target.value)}
                            data-testid="extracted-state"
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="extracted-zip">ZIP</FieldLabel>
                          <Input
                            id="extracted-zip"
                            value={displayData.zip ?? ''}
                            onChange={(e) => handleEditableFieldChange('zip', e.target.value)}
                            data-testid="extracted-zip"
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual ID Expiration Date if not extracted */}
                {!displayData.idExpiry && (
                  <Field>
                    <FieldLabel htmlFor="idExpiry">
                      ID Expiration Date
                    </FieldLabel>
                    <Input
                      id="idExpiry"
                      name="idExpiry"
                      type="date"
                      value={manualExpiry}
                      onChange={(e) => handleManualExpiryChange(e.target.value)}
                      disabled={isConfirmed}
                      data-testid="id-expiry-input"
                    />
                  </Field>
                )}
                {/* Hidden field for idExpiry to include in form submission */}
                {displayData.idExpiry && (
                  <input type="hidden" name="idExpiry" value={displayData.idExpiry} />
                )}

                {/* ID Expired Banner */}
                {isExpired && (
                  <div
                    className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                    data-testid="id-expired-banner"
                  >
                    <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        ID EXPIRED
                      </p>
                      <p className="text-xs text-destructive/80">
                        This ID has expired and cannot be used for onboarding.
                      </p>
                    </div>
                  </div>
                )}

                {/* ID Expiring Soon Banner */}
                {isExpiringSoon && (
                  <div
                    className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3"
                    data-testid="id-expiring-banner"
                  >
                    <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                    <div>
                      <p className="text-sm font-medium text-warning">
                        ID EXPIRING SOON
                      </p>
                      <p className="text-xs text-warning/80">
                        This ID expires in {daysUntilExpiry} day
                        {daysUntilExpiry !== 1 ? 's' : ''}. Consider requesting
                        a renewed ID.
                      </p>
                    </div>
                  </div>
                )}

                {/* Age Compliance Warning */}
                {age !== null && age < 21 && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        Age Compliance Warning
                      </p>
                      <p className="text-xs text-destructive/80">
                        Client is {age} years old. Must be 21+ for sports
                        betting.
                      </p>
                    </div>
                  </div>
                )}

                {/* Age OK Badge */}
                {age !== null && age >= 21 && (
                  <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-medium text-success">
                        Age Verified
                      </p>
                      <p className="text-xs text-success/80">
                        Client is {age} years old. Meets minimum age
                        requirement.
                      </p>
                    </div>
                  </div>
                )}

                {/* Confirm Button */}
                {!isConfirmed && (
                  <Button
                    type="button"
                    onClick={onConfirm}
                    className="w-full"
                    disabled={isExpired}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm & Save ID Data
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  )
}
