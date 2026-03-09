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
}

export function SystemConfigView({ initialValues }: SystemConfigViewProps) {
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
