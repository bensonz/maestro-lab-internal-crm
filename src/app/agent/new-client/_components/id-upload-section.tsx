'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Loader2,
} from 'lucide-react'

interface ExtractedData {
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

interface IdUploadSectionProps {
  onDataExtracted: (data: ExtractedData) => void
  onConfirm: () => void
  isConfirmed: boolean
}

export function IdUploadSection({
  onDataExtracted,
  onConfirm,
  isConfirmed,
}: IdUploadSectionProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [dragActive, setDragActive] = useState(false)

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
      }
    },
    [],
  )

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadedFile(file)
      setIsProcessing(true)

      try {
        const data = await simulateOCR(file)
        setExtractedData(data)
        onDataExtracted(data)
      } catch {
        // Handle error silently for now
      } finally {
        setIsProcessing(false)
      }
    },
    [simulateOCR, onDataExtracted],
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
    setExtractedData(null)
  }, [])

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

  const age = extractedData?.dateOfBirth
    ? calculateAge(extractedData.dateOfBirth)
    : null

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
        {!uploadedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
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
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    Browse Files
                  </span>
                </Button>
              </label>
              <Button type="button" variant="outline" size="sm" disabled>
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Preview */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              {!isConfirmed && (
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

            {/* Processing State */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-primary">
                  Processing ID...
                </span>
              </div>
            )}

            {/* Extracted Data Preview */}
            {extractedData && !isProcessing && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Extracted Information
                  </p>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium text-foreground">
                        {extractedData.firstName}{' '}
                        {extractedData.middleName &&
                          `${extractedData.middleName} `}
                        {extractedData.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Date of Birth:
                      </span>
                      <span className="font-medium text-foreground">
                        {extractedData.dateOfBirth}
                      </span>
                    </div>
                    {extractedData.address && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-medium text-foreground">
                          {extractedData.address}, {extractedData.city},{' '}
                          {extractedData.state} {extractedData.zip}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

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
                  <Button type="button" onClick={onConfirm} className="w-full">
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
