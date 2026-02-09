import Image from 'next/image'
import { Building2, CreditCard, Trophy, Zap } from 'lucide-react'
import { PlatformType } from '@/types'
import { PLATFORM_INFO } from '@/lib/platforms'

const FALLBACK_ICONS: Partial<
  Record<PlatformType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>
> = {
  BANK: Building2,
  PAYPAL: CreditCard,
  EDGEBOOST: Zap,
  BET365: Trophy,
}

interface PlatformIconProps {
  platform: PlatformType
  /** Icon size in pixels (width and height). Default: 20 */
  size?: number
  className?: string
}

export function PlatformIcon({ platform, size = 20, className }: PlatformIconProps) {
  const info = PLATFORM_INFO[platform]

  if (info.logoPath) {
    return (
      <Image
        src={info.logoPath}
        alt={`${info.name} logo`}
        width={size}
        height={size}
        className={className}
        unoptimized
      />
    )
  }

  const FallbackIcon = FALLBACK_ICONS[platform] ?? Trophy
  return <FallbackIcon style={{ width: size, height: size }} className={className} />
}
