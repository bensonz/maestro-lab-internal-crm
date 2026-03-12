'use client'

import { useState, useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Gauge,
  DollarSign,
  ShieldAlert,
  Wrench,
  Target,
  ListChecks,
  Plus,
  X,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  CONFIG_REGISTRY,
  CONFIG_CATEGORIES,
  PLATFORM_DEFAULTS,
  PLATFORM_LABELS,
  type ConfigDefinition,
  type ConfigCategory,
} from '@/lib/config-defaults'
import { updateSystemConfig } from '@/app/actions/system-config'
import { savePlatformStatuses } from '@/app/actions/status-config'
import type { StatusConfigType } from '@/lib/status-config-keys'
import type { StatusOption, SportsbookStatusGroup } from '@/lib/account-status-config'
import {
  SPORTSBOOK_STATUSES,
  BANK_STATUSES,
  EDGEBOOST_STATUSES,
  PAYPAL_STATUSES,
  STATUS_GROUP_LABELS,
} from '@/lib/account-status-config'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Helpers ─────────────────────────────────────────────

const categoryIcons: Record<ConfigCategory, typeof Gauge> = {
  'Platform Targets': Target,
  'Cockpit / Dashboard': Gauge,
  Commission: DollarSign,
  'Risk Scoring': ShieldAlert,
  Operations: Wrench,
}

// Platform favicon domains for logos in config rows
const PLATFORM_FAVICON: Record<string, string> = {
  DRAFTKINGS: 'draftkings.com',
  FANDUEL: 'fanduel.com',
  BETMGM: 'betmgm.com',
  CAESARS: 'caesars.com',
  FANATICS: 'sportsbook.fanatics.com',
  BALLYBET: 'ballybet.com',
  BETRIVERS: 'betrivers.com',
  BET365: 'bet365.com',
  ESPNBET: 'espnbet.com',
  BANK: 'chase.com',
  EDGEBOOST: 'edgeboost.com',
  PAYPAL: 'paypal.com',
}

function getFaviconUrl(platform: string): string {
  const domain = PLATFORM_FAVICON[platform]
  if (!domain) return ''
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

function formatType(type: string): string {
  switch (type) {
    case 'currency':
      return '$'
    case 'percentage':
      return '%'
    case 'days':
      return 'days'
    case 'hours':
      return 'hrs'
    default:
      return ''
  }
}

function getRegistryByCategory(): Map<ConfigCategory, ConfigDefinition[]> {
  const map = new Map<ConfigCategory, ConfigDefinition[]>()
  for (const cat of CONFIG_CATEGORIES) {
    map.set(cat, CONFIG_REGISTRY.filter((c) => c.category === cat))
  }
  return map
}

// Group platform config keys by platform name
// e.g. DRAFTKINGS -> [DRAFTKINGS_BALANCE_TARGET, DRAFTKINGS_ACCOUNT_TARGET, DRAFTKINGS_MIN_ACCOUNT]
function getPlatformGroups(): { platform: string; label: string; keys: { balanceKey: string; accountKey: string; minKey: string } }[] {
  return Object.keys(PLATFORM_DEFAULTS).map((p) => ({
    platform: p,
    label: PLATFORM_LABELS[p] ?? p,
    keys: {
      balanceKey: `${p}_BALANCE_TARGET`,
      accountKey: `${p}_ACCOUNT_TARGET`,
      minKey: `${p}_MIN_ACCOUNT`,
    },
  }))
}

// ── Component ───────────────────────────────────────────

interface SystemConfigViewProps {
  initialValues: Record<string, string>
  statusConfigs: Record<string, StatusOption[]>
}

export function SystemConfigView({ initialValues, statusConfigs }: SystemConfigViewProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const merged: Record<string, string> = {}
    for (const def of CONFIG_REGISTRY) {
      merged[def.key] = initialValues[def.key] ?? String(def.defaultValue)
    }
    return merged
  })

  const [savedValues, setSavedValues] = useState<Record<string, string>>(() => ({
    ...initialValues,
  }))

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(CONFIG_CATEGORIES),
  )

  const [isPending, startTransition] = useTransition()
  const [savingCategory, setSavingCategory] = useState<string | null>(null)

  const grouped = getRegistryByCategory()

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleReset = useCallback((key: string, defaultValue: number) => {
    setValues((prev) => ({ ...prev, [key]: String(defaultValue) }))
  }, [])

  const isModified = useCallback(
    (key: string) => {
      const def = CONFIG_REGISTRY.find((c) => c.key === key)
      if (!def) return false
      const currentVal = values[key]
      const defaultVal = String(def.defaultValue)
      return currentVal !== defaultVal
    },
    [values],
  )

  const hasUnsavedChanges = useCallback(
    (category: string) => {
      const defs = CONFIG_REGISTRY.filter((c) => c.category === category)
      return defs.some((def) => {
        const current = values[def.key]
        const saved = savedValues[def.key] ?? String(def.defaultValue)
        return current !== saved
      })
    },
    [values, savedValues],
  )

  const handleSaveCategory = (category: string) => {
    const defs = CONFIG_REGISTRY.filter((c) => c.category === category)
    const entries = defs
      .filter((def) => {
        const current = values[def.key]
        const saved = savedValues[def.key] ?? String(def.defaultValue)
        return current !== saved
      })
      .map((def) => ({ key: def.key, value: values[def.key] }))

    if (entries.length === 0) {
      toast.info('No changes to save')
      return
    }

    setSavingCategory(category)
    startTransition(async () => {
      const result = await updateSystemConfig(entries)
      setSavingCategory(null)

      if (result.success) {
        const newSaved = { ...savedValues }
        for (const entry of entries) {
          newSaved[entry.key] = entry.value
        }
        setSavedValues(newSaved)
        toast.success(`${category} settings saved`, {
          description: `${entries.length} value${entries.length > 1 ? 's' : ''} updated`,
        })
      } else {
        toast.error('Failed to save', { description: result.error })
      }
    })
  }

  const handleDiscardCategory = useCallback(
    (defs: ConfigDefinition[]) => {
      setValues((prev) => {
        const next = { ...prev }
        for (const def of defs) {
          next[def.key] = savedValues[def.key] ?? String(def.defaultValue)
        }
        return next
      })
    },
    [savedValues],
  )

  const totalModified = CONFIG_REGISTRY.filter((c) => isModified(c.key)).length

  return (
    <div className="space-y-4" data-testid="system-config-view">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {CONFIG_REGISTRY.length} configurable values across {CONFIG_CATEGORIES.length} categories
          </p>
          {totalModified > 0 && (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary"
            >
              {totalModified} modified from defaults
            </Badge>
          )}
        </div>
      </div>

      {/* Category Sections */}
      {CONFIG_CATEGORIES.map((category) => {
        const defs = grouped.get(category) ?? []
        const CatIcon = categoryIcons[category]
        const isOpen = expandedCategories.has(category)
        const unsaved = hasUnsavedChanges(category)
        const modifiedCount = defs.filter((d) => isModified(d.key)).length
        const isSaving = savingCategory === category && isPending
        const isPlatformCategory = category === 'Platform Targets'

        return (
          <Collapsible
            key={category}
            open={isOpen}
            onOpenChange={() => toggleCategory(category)}
          >
            <div
              className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm"
              data-testid={`config-category-${category.replace(/\s+/g, '-').toLowerCase()}`}
            >
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-accent/5">
                  <div className="flex items-center gap-2.5">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CatIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{category}</span>
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 font-mono text-[10px]"
                    >
                      {isPlatformCategory ? `${Object.keys(PLATFORM_DEFAULTS).length} platforms` : defs.length}
                    </Badge>
                    {modifiedCount > 0 && (
                      <Badge
                        variant="outline"
                        className="h-5 border-primary/30 bg-primary/10 px-1.5 font-mono text-[10px] text-primary"
                      >
                        {modifiedCount} modified
                      </Badge>
                    )}
                  </div>
                  {unsaved && (
                    <Badge
                      variant="outline"
                      className="border-warning/30 bg-warning/10 text-warning text-[10px]"
                    >
                      unsaved changes
                    </Badge>
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border/30">
                  {isPlatformCategory ? (
                    <PlatformTargetsSection
                      values={values}
                      onChange={handleChange}
                      onReset={handleReset}
                      isModified={isModified}
                    />
                  ) : (
                    <div className="divide-y divide-border/20">
                      {defs.map((def) => (
                        <ConfigField
                          key={def.key}
                          definition={def}
                          value={values[def.key]}
                          modified={isModified(def.key)}
                          onChange={(v) => handleChange(def.key, v)}
                          onReset={() => handleReset(def.key, def.defaultValue)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Save / Discard buttons */}
                  <div className="flex items-center justify-end gap-2 border-t border-border/30 px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!unsaved || isSaving}
                      onClick={() => handleDiscardCategory(defs)}
                      data-testid={`discard-${category.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      disabled={!unsaved || isSaving}
                      onClick={() => handleSaveCategory(category)}
                      data-testid={`save-${category.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                      {isSaving ? (
                        <>
                          <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          Save {category}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}

      {/* Account Statuses Section */}
      <AccountStatusesSection initialStatuses={statusConfigs} />
    </div>
  )
}

// ── Platform Targets Section (custom grouped layout) ────

function PlatformTargetsSection({
  values,
  onChange,
  onReset,
  isModified,
}: {
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: (key: string, defaultValue: number) => void
  isModified: (key: string) => boolean
}) {
  const platforms = getPlatformGroups()

  return (
    <div className="divide-y divide-border/20">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_160px_100px_160px] items-center gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Platform</span>
        <span className="text-center">Total Target</span>
        <span className="text-center">Accounts</span>
        <span className="text-center">Min / Account</span>
      </div>
      {platforms.map((p) => (
        <PlatformRow
          key={p.platform}
          platform={p.platform}
          label={p.label}
          keys={p.keys}
          values={values}
          onChange={onChange}
          onReset={onReset}
          isModified={isModified}
        />
      ))}
    </div>
  )
}

function PlatformRow({
  platform,
  label,
  keys,
  values,
  onChange,
  onReset,
  isModified,
}: {
  platform: string
  label: string
  keys: { balanceKey: string; accountKey: string; minKey: string }
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: (key: string, defaultValue: number) => void
  isModified: (key: string) => boolean
}) {
  const faviconUrl = getFaviconUrl(platform)
  const balanceDef = CONFIG_REGISTRY.find((c) => c.key === keys.balanceKey)!
  const accountDef = CONFIG_REGISTRY.find((c) => c.key === keys.accountKey)!
  const minDef = CONFIG_REGISTRY.find((c) => c.key === keys.minKey)!

  return (
    <div
      className="grid grid-cols-[1fr_160px_100px_160px] items-center gap-3 px-4 py-3 transition-colors"
      data-testid={`platform-row-${platform}`}
    >
      {/* Platform name + logo */}
      <div className="flex items-center gap-2.5">
        {faviconUrl && (
          <img
            src={faviconUrl}
            alt={label}
            width={20}
            height={20}
            className="rounded-sm"
          />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>

      {/* Total target */}
      <PlatformInlineInput
        configKey={keys.balanceKey}
        definition={balanceDef}
        value={values[keys.balanceKey]}
        modified={isModified(keys.balanceKey)}
        onChange={onChange}
        onReset={onReset}
        prefix="$"
      />

      {/* Account target */}
      <PlatformInlineInput
        configKey={keys.accountKey}
        definition={accountDef}
        value={values[keys.accountKey]}
        modified={isModified(keys.accountKey)}
        onChange={onChange}
        onReset={onReset}
      />

      {/* Min per account */}
      <PlatformInlineInput
        configKey={keys.minKey}
        definition={minDef}
        value={values[keys.minKey]}
        modified={isModified(keys.minKey)}
        onChange={onChange}
        onReset={onReset}
        prefix="$"
      />
    </div>
  )
}

function PlatformInlineInput({
  configKey,
  definition,
  value,
  modified,
  onChange,
  onReset,
  prefix,
}: {
  configKey: string
  definition: ConfigDefinition
  value: string
  modified: boolean
  onChange: (key: string, value: string) => void
  onReset: (key: string, defaultValue: number) => void
  prefix?: string
}) {
  const numValue = Number(value)
  const isValid = !isNaN(numValue)
  const isBelowMin = isValid && definition.min !== undefined && numValue < definition.min
  const isAboveMax = isValid && definition.max !== undefined && numValue > definition.max
  const hasError = isBelowMin || isAboveMax || !isValid

  return (
    <div className="flex items-center justify-center gap-1.5">
      {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
      <Input
        type="number"
        className={cn(
          'h-7 w-full border-border bg-background font-mono text-xs',
          hasError && 'border-destructive',
        )}
        value={value}
        onChange={(e) => onChange(configKey, e.target.value)}
        min={definition.min}
        max={definition.max}
        step={definition.step ?? 1}
        data-testid={`config-input-${configKey}`}
      />
      {modified && (
        <button
          onClick={() => onReset(configKey, definition.defaultValue)}
          className="flex h-5 shrink-0 items-center rounded border border-border/50 px-1 text-[9px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          title={`Reset to ${definition.defaultValue}`}
          data-testid={`config-reset-${configKey}`}
        >
          <RotateCcw className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
}

// ── Config Field Component (for non-platform categories) ─

function ConfigField({
  definition,
  value,
  modified,
  onChange,
  onReset,
}: {
  definition: ConfigDefinition
  value: string
  modified: boolean
  onChange: (value: string) => void
  onReset: () => void
}) {
  const suffix = formatType(definition.type)
  const numValue = Number(value)
  const isValid = !isNaN(numValue)
  const isBelowMin = isValid && definition.min !== undefined && numValue < definition.min
  const isAboveMax = isValid && definition.max !== undefined && numValue > definition.max

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 transition-colors',
        modified && 'bg-primary/5',
      )}
      data-testid={`config-field-${definition.key}`}
    >
      {/* Label + Description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{definition.label}</span>
          {modified && (
            <Badge
              variant="outline"
              className="h-4 border-primary/30 bg-primary/10 px-1 text-[9px] text-primary"
            >
              modified
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {definition.description}
        </p>
        {(isBelowMin || isAboveMax) && (
          <p className="mt-0.5 text-xs text-destructive">
            {isBelowMin
              ? `Min: ${definition.min}`
              : `Max: ${definition.max}`}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="flex shrink-0 items-center gap-2">
        {definition.type === 'currency' && (
          <span className="text-sm text-muted-foreground">$</span>
        )}
        <Input
          type="number"
          className={cn(
            'h-8 w-28 border-border bg-background font-mono text-sm',
            (isBelowMin || isAboveMax || !isValid) && 'border-destructive',
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={definition.min}
          max={definition.max}
          step={definition.step ?? 1}
          data-testid={`config-input-${definition.key}`}
        />
        {suffix && suffix !== '$' && (
          <span className="text-xs text-muted-foreground">{suffix}</span>
        )}

        {/* Reset to default button */}
        {modified && (
          <button
            onClick={onReset}
            className="flex h-6 items-center gap-1 rounded border border-border/50 px-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            title={`Reset to default: ${definition.defaultValue}`}
            data-testid={`config-reset-${definition.key}`}
          >
            <RotateCcw className="h-3 w-3" />
            {definition.defaultValue}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Account Statuses Editor ─────────────────────────────────

const FINANCIAL_PLATFORMS: StatusConfigType[] = ['BANK', 'EDGEBOOST', 'PAYPAL']
const SPORTSBOOK_PLATFORM_ORDER: StatusConfigType[] = [
  'DRAFTKINGS', 'FANDUEL', 'BETMGM', 'CAESARS', 'FANATICS',
  'BALLYBET', 'BETRIVERS', 'ESPNBET', 'BET365',
]
const ALL_PLATFORM_ORDER: StatusConfigType[] = [...SPORTSBOOK_PLATFORM_ORDER, ...FINANCIAL_PLATFORMS]

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  DRAFTKINGS: 'DraftKings',
  FANDUEL: 'FanDuel',
  BETMGM: 'BetMGM',
  CAESARS: 'Caesars',
  FANATICS: 'Fanatics',
  BALLYBET: 'Bally Bet',
  BETRIVERS: 'BetRivers',
  ESPNBET: 'ESPN BET',
  BET365: 'Bet365',
  BANK: 'Online Banking',
  EDGEBOOST: 'EdgeBoost',
  PAYPAL: 'PayPal',
}

const GROUP_OPTIONS: { value: SportsbookStatusGroup; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'setup', label: 'Setup' },
  { value: 'verification', label: 'Verification' },
  { value: 'limited', label: 'Limited' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'closed', label: 'Closed' },
  { value: 'other', label: 'Other' },
]

const COLOR_PRESETS = [
  { bg: 'bg-green-400/20', text: 'text-green-400', label: 'Green' },
  { bg: 'bg-emerald-600/25', text: 'text-emerald-400', label: 'Emerald' },
  { bg: 'bg-sky-400/20', text: 'text-sky-300', label: 'Sky' },
  { bg: 'bg-blue-400/20', text: 'text-blue-400', label: 'Blue' },
  { bg: 'bg-yellow-400/20', text: 'text-yellow-400', label: 'Yellow' },
  { bg: 'bg-orange-400/20', text: 'text-orange-400', label: 'Orange' },
  { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Red' },
  { bg: 'bg-purple-400/20', text: 'text-purple-400', label: 'Purple' },
  { bg: 'bg-red-300/15', text: 'text-red-300', label: 'Rose' },
  { bg: 'bg-muted/50', text: 'text-muted-foreground', label: 'Muted' },
  { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Gray' },
]

/** Default statuses to reset to (sportsbook vs financial) */
const RESET_DEFAULTS: Record<string, StatusOption[]> = {
  DRAFTKINGS: SPORTSBOOK_STATUSES,
  FANDUEL: SPORTSBOOK_STATUSES,
  BETMGM: SPORTSBOOK_STATUSES,
  CAESARS: SPORTSBOOK_STATUSES,
  FANATICS: SPORTSBOOK_STATUSES,
  BALLYBET: SPORTSBOOK_STATUSES,
  BETRIVERS: SPORTSBOOK_STATUSES,
  ESPNBET: SPORTSBOOK_STATUSES,
  BET365: SPORTSBOOK_STATUSES,
  BANK: BANK_STATUSES,
  EDGEBOOST: EDGEBOOST_STATUSES,
  PAYPAL: PAYPAL_STATUSES,
}

function AccountStatusesSection({
  initialStatuses,
}: {
  initialStatuses: Record<string, StatusOption[]>
}) {
  // Initialize state for all 12 platforms
  const [statusSections, setStatusSections] = useState<Record<string, StatusOption[]>>(() => {
    const sections: Record<string, StatusOption[]> = {}
    for (const platform of ALL_PLATFORM_ORDER) {
      sections[platform] = [...(initialStatuses[platform] ?? [])]
    }
    return sections
  })

  const [savedSections, setSavedSections] = useState<Record<string, StatusOption[]>>(() => {
    const sections: Record<string, StatusOption[]> = {}
    for (const platform of ALL_PLATFORM_ORDER) {
      sections[platform] = [...(initialStatuses[platform] ?? [])]
    }
    return sections
  })

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set<string>(),
  )
  const [isPending, startTransition] = useTransition()
  const [savingSection, setSavingSection] = useState<string | null>(null)

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hasChanges = (key: string) => {
    return JSON.stringify(statusSections[key]) !== JSON.stringify(savedSections[key])
  }

  const anyChanges = ALL_PLATFORM_ORDER.some((p) => hasChanges(p))

  const updateStatus = (sectionKey: string, index: number, updates: Partial<StatusOption>) => {
    setStatusSections((prev) => {
      const next = { ...prev }
      const arr = [...next[sectionKey]]
      arr[index] = { ...arr[index], ...updates }
      if (updates.label !== undefined) {
        arr[index].value = updates.label.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
      }
      next[sectionKey] = arr
      return next
    })
  }

  const deleteStatus = (sectionKey: string, index: number) => {
    setStatusSections((prev) => {
      const next = { ...prev }
      next[sectionKey] = next[sectionKey].filter((_, i) => i !== index)
      return next
    })
  }

  const addStatus = (sectionKey: string) => {
    const isFinancial = FINANCIAL_PLATFORMS.includes(sectionKey as StatusConfigType)
    setStatusSections((prev) => ({
      ...prev,
      [sectionKey]: [
        ...prev[sectionKey],
        {
          value: `NEW_STATUS_${Date.now()}`,
          label: 'New Status',
          group: isFinancial ? 'financial' as const : 'other' as const,
          color: 'bg-muted/50',
          textColor: 'text-muted-foreground',
        },
      ],
    }))
  }

  const resetSection = (sectionKey: string) => {
    const defaults = RESET_DEFAULTS[sectionKey]
    if (!defaults) return
    setStatusSections((prev) => ({
      ...prev,
      [sectionKey]: [...defaults],
    }))
  }

  const saveSection = (sectionKey: string) => {
    const statuses = statusSections[sectionKey]
    setSavingSection(sectionKey)
    startTransition(async () => {
      const result = await savePlatformStatuses(sectionKey as StatusConfigType, statuses)
      setSavingSection(null)

      if (result.success) {
        setSavedSections((prev) => ({
          ...prev,
          [sectionKey]: [...statuses],
        }))
        toast.success('Statuses saved', {
          description: `${statuses.length} statuses for ${PLATFORM_DISPLAY_NAMES[sectionKey] ?? sectionKey}`,
        })
      } else {
        toast.error('Failed to save', { description: result.error })
      }
    })
  }

  const isSportsbook = (key: string) => SPORTSBOOK_PLATFORM_ORDER.includes(key as StatusConfigType)

  const renderPlatformSection = (platform: StatusConfigType) => {
    const isOpen = expandedSections.has(platform)
    const changed = hasChanges(platform)
    const isSaving = savingSection === platform && isPending
    const statuses = statusSections[platform] ?? []
    const showGroups = isSportsbook(platform)
    const faviconUrl = getFaviconUrl(platform)
    const displayName = PLATFORM_DISPLAY_NAMES[platform] ?? platform

    return (
      <div key={platform} className="border-b border-border/20 last:border-b-0">
        <button
          className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-accent/5"
          onClick={() => toggleSection(platform)}
        >
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {faviconUrl && (
              <img src={faviconUrl} alt={displayName} width={16} height={16} className="rounded-sm" />
            )}
            <span className="text-xs font-semibold">{displayName}</span>
            <Badge variant="outline" className="h-4 px-1 font-mono text-[9px]">
              {statuses.length}
            </Badge>
            {changed && (
              <Badge
                variant="outline"
                className="h-4 border-warning/30 bg-warning/10 px-1 text-[9px] text-warning"
              >
                unsaved
              </Badge>
            )}
          </div>
        </button>

        {isOpen && (
          <div className="px-4 pb-3">
            {/* Column headers */}
            <div className={cn(
              'grid items-center gap-2 px-1 pb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground',
              showGroups
                ? 'grid-cols-[16px_1fr_100px_100px_28px]'
                : 'grid-cols-[16px_1fr_100px_28px]',
            )}>
              <span></span>
              <span>Label</span>
              {showGroups && <span>Group</span>}
              <span>Color</span>
              <span></span>
            </div>

            {/* Status rows */}
            <div className="space-y-1">
              {statuses.map((status, idx) => (
                <div
                  key={`${platform}-${idx}`}
                  className={cn(
                    'grid items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-accent/5',
                    showGroups
                      ? 'grid-cols-[16px_1fr_100px_100px_28px]'
                      : 'grid-cols-[16px_1fr_100px_28px]',
                  )}
                >
                  <div className={cn('h-3.5 w-3.5 rounded-sm border border-border/30', status.color)} />

                  <Input
                    className="h-7 border-border/50 bg-background text-xs"
                    value={status.label}
                    onChange={(e) => updateStatus(platform, idx, { label: e.target.value })}
                    data-testid={`status-label-${platform}-${idx}`}
                  />

                  {showGroups && (
                    <Select
                      value={status.group as string}
                      onValueChange={(v) =>
                        updateStatus(platform, idx, { group: v as SportsbookStatusGroup })
                      }
                    >
                      <SelectTrigger className="h-7 border-border/50 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUP_OPTIONS.map((g) => (
                          <SelectItem key={g.value} value={g.value} className="text-xs">
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select
                    value={`${status.color}|${status.textColor}`}
                    onValueChange={(v) => {
                      const [bg, text] = v.split('|')
                      updateStatus(platform, idx, { color: bg, textColor: text })
                    }}
                  >
                    <SelectTrigger className="h-7 border-border/50 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('h-2.5 w-2.5 rounded-sm', status.color)} />
                        <span className="truncate">
                          {COLOR_PRESETS.find((c) => c.bg === status.color)?.label ?? 'Custom'}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_PRESETS.map((c) => (
                        <SelectItem key={c.bg} value={`${c.bg}|${c.text}`} className="text-xs">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-3 w-3 rounded-sm', c.bg)} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <button
                    onClick={() => deleteStatus(platform, idx)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Remove status"
                    data-testid={`status-delete-${platform}-${idx}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add + Save/Reset buttons */}
            <div className="mt-2 flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => addStatus(platform)}
                data-testid={`status-add-${platform}`}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Status
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!changed || isSaving}
                  onClick={() => resetSection(platform)}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset Defaults
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!changed || isSaving}
                  onClick={() => saveSection(platform)}
                  data-testid={`status-save-${platform}`}
                >
                  {isSaving ? (
                    <>
                      <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-1 h-3 w-3" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Collapsible
      open={expandedSections.has('_ACCOUNT_STATUSES')}
      onOpenChange={() => toggleSection('_ACCOUNT_STATUSES')}
      defaultOpen
    >
      <div
        className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm"
        data-testid="config-category-account-statuses"
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-accent/5">
            <div className="flex items-center gap-2.5">
              {expandedSections.has('_ACCOUNT_STATUSES') ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Account Statuses</span>
              <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
                12 platforms
              </Badge>
              {anyChanges && (
                <Badge
                  variant="outline"
                  className="border-warning/30 bg-warning/10 text-warning text-[10px]"
                >
                  unsaved changes
                </Badge>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/30">
            {/* Sportsbook header */}
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/20">
              Sportsbook Platforms
            </div>
            {SPORTSBOOK_PLATFORM_ORDER.map(renderPlatformSection)}

            {/* Financial header */}
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/20 border-t border-border/30">
              Financial Platforms
            </div>
            {FINANCIAL_PLATFORMS.map(renderPlatformSection)}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
