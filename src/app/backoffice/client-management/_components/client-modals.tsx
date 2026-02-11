'use client'

import { Images, Eye, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Client, Transaction } from './types'

// ============================================================================
// Helpers
// ============================================================================

// Map platform display name to DB PlatformType for screenshot lookup
const PLATFORM_NAME_TO_TYPE: Record<string, string> = {
  PayPal: 'PAYPAL',
  Bank: 'BANK',
  Edgeboost: 'EDGEBOOST',
  DraftKings: 'DRAFTKINGS',
  FanDuel: 'FANDUEL',
  BetMGM: 'BETMGM',
  Caesars: 'CAESARS',
  Fanatics: 'FANATICS',
  BallyBet: 'BALLYBET',
  BetRivers: 'BETRIVERS',
  Bet365: 'BET365',
}

function getScreenshotUrl(url: string): string {
  if (url.startsWith('uploads/')) return `/api/upload?path=${url}`
  return url
}

function getPlatformScreenshots(client: Client, platformName: string): string[] {
  const platformType = PLATFORM_NAME_TO_TYPE[platformName]
  if (!platformType || !client.platformDetails) return []
  const detail = client.platformDetails.find((d) => d.platformType === platformType)
  return detail?.screenshots ?? []
}

function getAllScreenshots(
  client: Client,
): { platform: string; url: string; type: string }[] {
  const screenshots: { platform: string; url: string; type: string }[] = []

  // ID Document
  if (client.profile.idImageUrl) {
    screenshots.push({
      platform: 'ID Document',
      url: getScreenshotUrl(client.profile.idImageUrl),
      type: 'ID',
    })
  }

  // Finance platforms
  client.financePlatforms.forEach((p) => {
    const urls = getPlatformScreenshots(client, p.name)
    urls.forEach((url, idx) => {
      screenshots.push({
        platform: p.name,
        url: getScreenshotUrl(url),
        type: `Screenshot ${idx + 1}`,
      })
    })
  })

  // Betting platforms
  client.bettingPlatforms.forEach((p) => {
    const urls = getPlatformScreenshots(client, p.name)
    urls.forEach((url, idx) => {
      screenshots.push({
        platform: p.name,
        url: getScreenshotUrl(url),
        type: `Screenshot ${idx + 1}`,
      })
    })
  })

  return screenshots
}

function getCredentialScreenshots(
  client: Client,
): { platform: string; url: string; type: string }[] {
  const screenshots: { platform: string; url: string; type: string }[] = []

  client.financePlatforms.forEach((p) => {
    const urls = getPlatformScreenshots(client, p.name)
    urls.forEach((url, idx) => {
      screenshots.push({
        platform: p.name,
        url: getScreenshotUrl(url),
        type: `Credentials ${idx + 1}`,
      })
    })
  })

  client.bettingPlatforms.forEach((p) => {
    const urls = getPlatformScreenshots(client, p.name)
    urls.forEach((url, idx) => {
      screenshots.push({
        platform: p.name,
        url: getScreenshotUrl(url),
        type: `Credentials ${idx + 1}`,
      })
    })
  })

  return screenshots
}

function getAllTransactionsSorted(client: Client): Transaction[] {
  return [...client.transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

// ============================================================================
// Component
// ============================================================================

interface ClientModalsProps {
  client: Client
  showIdModal: boolean
  onShowIdModalChange: (v: boolean) => void
  showSsnModal: boolean
  onShowSsnModalChange: (v: boolean) => void
  showDocumentModal: { url: string; type: string } | null
  onShowDocumentModalChange: (v: { url: string; type: string } | null) => void
  showAllScreenshotsModal: boolean
  onShowAllScreenshotsModalChange: (v: boolean) => void
  showCredentialsScreenshotModal: boolean
  onShowCredentialsScreenshotModalChange: (v: boolean) => void
  showAllTransactionsModal: boolean
  onShowAllTransactionsModalChange: (v: boolean) => void
  onViewDocument: (url: string, type: string) => void
}

export function ClientModals({
  client,
  showIdModal,
  onShowIdModalChange,
  showSsnModal,
  onShowSsnModalChange,
  showDocumentModal,
  onShowDocumentModalChange,
  showAllScreenshotsModal,
  onShowAllScreenshotsModalChange,
  showCredentialsScreenshotModal,
  onShowCredentialsScreenshotModalChange,
  showAllTransactionsModal,
  onShowAllTransactionsModalChange,
  onViewDocument,
}: ClientModalsProps) {
  return (
    <>
      {/* ID Image Modal */}
      <Dialog open={showIdModal} onOpenChange={onShowIdModalChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ID Document</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center rounded-lg bg-muted p-4">
            {client.profile.idImageUrl ? (
              <img
                src={getScreenshotUrl(client.profile.idImageUrl)}
                alt="ID Document"
                className="max-h-[300px] max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No ID document uploaded</p>
            )}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Expires: {client.profile.idExpiryDate}
          </div>
        </DialogContent>
      </Dialog>

      {/* SSN Document Modal */}
      <Dialog open={showSsnModal} onOpenChange={onShowSsnModalChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>SSN Document</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center rounded-lg bg-muted p-4">
            {client.profile.ssnDocumentUrl ? (
              <img
                src={getScreenshotUrl(client.profile.ssnDocumentUrl)}
                alt="SSN Document"
                className="max-h-[300px] max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No SSN document uploaded</p>
            )}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            SSN: {client.profile.ssn}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document View Modal */}
      <Dialog
        open={!!showDocumentModal}
        onOpenChange={() => onShowDocumentModalChange(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{showDocumentModal?.type}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center rounded-lg bg-muted p-4">
            {showDocumentModal?.url ? (
              <img
                src={getScreenshotUrl(showDocumentModal.url)}
                alt="Document"
                className="max-h-[300px] max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No document available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* All Screenshots Modal */}
      <Dialog
        open={showAllScreenshotsModal}
        onOpenChange={onShowAllScreenshotsModalChange}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Images className="h-5 w-5" />
              All Screenshots &mdash; {client.profile.fullName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3">
              {getAllScreenshots(client).map((screenshot, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
                    <img
                      src={screenshot.url}
                      alt={`${screenshot.platform} - ${screenshot.type}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {screenshot.platform}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {screenshot.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Credentials Screenshots Modal */}
      <Dialog
        open={showCredentialsScreenshotModal}
        onOpenChange={onShowCredentialsScreenshotModalChange}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Platform Credentials &mdash; {client.profile.fullName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3">
              {getCredentialScreenshots(client).map((screenshot, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
                    <img
                      src={screenshot.url}
                      alt={`${screenshot.platform} - ${screenshot.type}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {screenshot.platform}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Login &amp; Password Screenshot
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* All Transactions Modal */}
      <Dialog
        open={showAllTransactionsModal}
        onOpenChange={onShowAllTransactionsModalChange}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              All Transactions &mdash; {client.profile.fullName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div className="space-y-2 p-4">
              {getAllTransactionsSorted(client).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded bg-muted/20 p-3 text-sm"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium capitalize">{tx.type}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {tx.date}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {tx.platform}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'font-mono font-semibold',
                        tx.type === 'deposit'
                          ? 'text-success'
                          : 'text-destructive',
                      )}
                    >
                      {tx.type === 'deposit' ? '+' : '-'}$
                      {tx.amount.toLocaleString()}
                    </span>
                    {tx.documentUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() =>
                          onViewDocument(
                            tx.documentUrl!,
                            tx.documentType || 'Document',
                          )
                        }
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {client.transactions.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No transactions recorded
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
