import {
  Flame,
  Footprints,
  GraduationCap,
  MessageCircle,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { BadgeIcon as BadgeIconName } from '../types'

const ICONS: Record<BadgeIconName, LucideIcon> = {
  footprints: Footprints,
  flame: Flame,
  graduation: GraduationCap,
  trophy: Trophy,
  target: Target,
  star: Star,
  message: MessageCircle,
  zap: Zap,
}

export function BadgeIcon({ name, className }: { name: BadgeIconName; className?: string }) {
  const Icon = ICONS[name] ?? Trophy
  return <Icon aria-hidden="true" className={className} />
}
