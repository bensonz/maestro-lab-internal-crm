'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { UploadDropzone, ScreenshotThumbnail } from '@/components/upload-dropzone'
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { mockExtractFromDebitCard } from '@/app/agent/new-client/_components/mock-extract-id'
import { updateDebitCardInfo } from '@/app/actions/client-drafts'
import { toast } from 'sonner'

interface CardData {
  images: string[]
  cardNumber: string
  cvv: string
  expiry: string
  detected: boolean
}

const EMPTY_CARD: CardData = {
  images: [],
  cardNumber: '',
  cvv: '',
  expiry: '',
  detected: false,
}

interface UploadCardDialogProps {
  draftId: string | null
  clientName: string
  /** Pre-existing bank card data from platformData */
  existingBankCard?: Partial<CardData> | null
  /** Pre-existing edgeboost card data from platformData */
  existingEdgeboostCard?: Partial<CardData> | null
  onClose: () => void
}

export function UploadCardDialog({
  draftId,
  clientName,
  existingBankCard,
  existingEdgeboostCard,
  onClose,
}: UploadCardDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [bankCard, setBankCard] = useState<CardData>({
    ...EMPTY_CARD,
    ...existingBankCard,
    images: existingBankCard?.images || [],
  })
  const [edgeboostCard, setEdgeboostCard] = useState<CardData>({
    ...EMPTY_CARD,
    ...existingEdgeboostCard,
    images: existingEdgeboostCard?.images || [],
  })
  const [extractingBank, setExtractingBank] = useState(false)
  const [extractingEdge, setExtractingEdge] = useState(false)

  // Reset state when dialog opens with new draft
  const prevDraftIdRef = useState<string | null>(null)
  if (draftId !== prevDraftIdRef[0]) {
    prevDraftIdRef[1](draftId)
    if (draftId) {
      setBankCard({
        ...EMPTY_CARD,
        ...existingBankCard,
        images: existingBankCard?.images || [],
      })
      setEdgeboostCard({
        ...EMPTY_CARD,
        ...existingEdgeboostCard,
        images: existingEdgeboostCard?.images || [],
      })
    }
  }

  const handleClose = () => {
    setBankCard({ ...EMPTY_CARD })
    setEdgeboostCard({ ...EMPTY_CARD })
    onClose()
  }

  // Handle image upload for a card section
  const handleUpload = useCallback(
    async (
      file: File,
      cardType: 'bank' | 'edgeboost',
    ): Promise<{ success: boolean; error?: string }> => {
      // Simulate upload — in production, upload to S3/cloud storage
      const fakeUrl = `/uploads/card-${cardType}-${Date.now()}-${file.name}`
      const setCard = cardType === 'bank' ? setBankCard : setEdgeboostCard
      const setExtracting = cardType === 'bank' ? setExtractingBank : setExtractingEdge

      // Add image to the list
      setCard((prev) => ({
        ...prev,
        images: [...prev.images, fakeUrl],
      }))

      // Run OCR extraction
      setExtracting(true)
      try {
        const result = await mockExtractFromDebitCard(file)
        setCard((prev) => ({
          ...prev,
          cardNumber: prev.cardNumber || result.cardNumber,
          cvv: prev.cvv || result.cvv,
          expiry: prev.expiry || result.expiry,
          detected: true,
        }))
      } catch {
        // OCR failed — user can still manually enter
      } finally {
        setExtracting(false)
      }

      return { success: true }
    },
    [],
  )

  const handleDeleteImage = (cardType: 'bank' | 'edgeboost', index: number) => {
    const setCard = cardType === 'bank' ? setBankCard : setEdgeboostCard
    setCard((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleSave = () => {
    if (!draftId) return

    const payload: Parameters<typeof updateDebitCardInfo>[1] = {}

    if (bankCard.cardNumber || bankCard.images.length > 0) {
      payload.bankCard = {
        cardNumber: bankCard.cardNumber,
        cvv: bankCard.cvv,
        expiry: bankCard.expiry,
        images: bankCard.images,
      }
    }

    if (edgeboostCard.cardNumber || edgeboostCard.images.length > 0) {
      payload.edgeboostCard = {
        cardNumber: edgeboostCard.cardNumber,
        cvv: edgeboostCard.cvv,
        expiry: edgeboostCard.expiry,
        images: edgeboostCard.images,
      }
    }

    if (!payload.bankCard && !payload.edgeboostCard) {
      toast.error('No card data to save')
      return
    }

    startTransition(async () => {
      const result = await updateDebitCardInfo(draftId, payload)
      if (result.success) {
        toast.success(`Debit card info saved for ${clientName}`)
        handleClose()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save card info')
      }
    })
  }

  const hasAnyData =
    bankCard.cardNumber || bankCard.images.length > 0 ||
    edgeboostCard.cardNumber || edgeboostCard.images.length > 0

  return (
    <Dialog open={!!draftId} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl" data-testid="upload-card-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Upload Debit Cards — {clientName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Upload photos of both bank and Edgeboost debit cards. OCR will auto-detect card details.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-2">
          {/* Bank Debit Card Section */}
          <CardSection
            title="Bank Debit Card"
            card={bankCard}
            onChange={setBankCard}
            onUpload={(file) => handleUpload(file, 'bank')}
            onDeleteImage={(idx) => handleDeleteImage('bank', idx)}
            isExtracting={extractingBank}
            dataTestIdPrefix="bank"
          />

          {/* Edgeboost Debit Card Section */}
          <CardSection
            title="Edgeboost Debit Card"
            card={edgeboostCard}
            onChange={setEdgeboostCard}
            onUpload={(file) => handleUpload(file, 'edgeboost')}
            onDeleteImage={(idx) => handleDeleteImage('edgeboost', idx)}
            isExtracting={extractingEdge}
            dataTestIdPrefix="edgeboost"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="terminal"
            onClick={handleSave}
            disabled={isPending || !hasAnyData}
            data-testid="save-card-info-btn"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Card Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card Section Sub-Component ─────────────────────────

interface CardSectionProps {
  title: string
  card: CardData
  onChange: React.Dispatch<React.SetStateAction<CardData>>
  onUpload: (file: File) => Promise<{ success: boolean; error?: string }>
  onDeleteImage: (index: number) => void
  isExtracting: boolean
  dataTestIdPrefix: string
}

function CardSection({
  title,
  card,
  onChange,
  onUpload,
  onDeleteImage,
  isExtracting,
  dataTestIdPrefix,
}: CardSectionProps) {
  const isComplete = !!card.cardNumber && !!card.cvv && !!card.expiry

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {isComplete ? (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        )}
      </div>

      {/* Upload area */}
      <UploadDropzone
        onUpload={onUpload}
        className="w-full"
      />

      {/* Uploaded images */}
      {card.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {card.images.map((img, idx) => (
            <ScreenshotThumbnail
              key={idx}
              src={img}
              size="sm"
              onDelete={() => onDeleteImage(idx)}
            />
          ))}
        </div>
      )}

      {/* OCR extraction status */}
      {isExtracting && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Detecting card info...
        </div>
      )}

      {/* Card info fields */}
      <Field>
        <FieldLabel htmlFor={`${dataTestIdPrefix}-card-number`}>Card Number</FieldLabel>
        <Input
          id={`${dataTestIdPrefix}-card-number`}
          value={card.cardNumber}
          onChange={(e) => onChange((prev) => ({ ...prev, cardNumber: e.target.value }))}
          placeholder="1234 5678 9012 3456"
          className="h-8 font-mono text-sm"
          maxLength={19}
          data-testid={`${dataTestIdPrefix}-card-number`}
        />
      </Field>

      <div className="flex gap-2">
        <Field className="flex-1">
          <FieldLabel htmlFor={`${dataTestIdPrefix}-cvv`}>CVV</FieldLabel>
          <Input
            id={`${dataTestIdPrefix}-cvv`}
            value={card.cvv}
            onChange={(e) => onChange((prev) => ({ ...prev, cvv: e.target.value }))}
            placeholder="123"
            className="h-8 font-mono text-sm"
            maxLength={4}
            data-testid={`${dataTestIdPrefix}-cvv`}
          />
        </Field>
        <Field className="flex-1">
          <FieldLabel htmlFor={`${dataTestIdPrefix}-expiry`}>Expiry</FieldLabel>
          <Input
            id={`${dataTestIdPrefix}-expiry`}
            value={card.expiry}
            onChange={(e) => onChange((prev) => ({ ...prev, expiry: e.target.value }))}
            placeholder="MM/YY"
            className="h-8 font-mono text-sm"
            maxLength={5}
            data-testid={`${dataTestIdPrefix}-expiry`}
          />
        </Field>
      </div>
    </div>
  )
}
