// =====================================================
// ICON MAP - Maps icon names to Lucide components
// =====================================================

import {
  LayoutDashboard,
  Video,
  DollarSign,
  BarChart2,
  MessageCircle,
  Star,
  Ticket,
  Users,
  GraduationCap,
  BookOpen,
  StickyNote,
  Award,
  LifeBuoy,
  Home,
  Search,
  Link as LinkIcon,
  ShieldCheck,
  List,
  FolderTree,
  Layout,
  FileText,
  Settings,
  Grid,
  Tag,
  Trophy,
  LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Trophy,
  LayoutDashboard,
  Video,
  DollarSign,
  BarChart2,
  MessageCircle,
  Star,
  Ticket,
  Users,
  GraduationCap,
  BookOpen,
  StickyNote,
  Award,
  LifeBuoy,
  Home,
  Search,
  Link: LinkIcon,
  ShieldCheck,
  List,
  FolderTree,
  Layout,
  FileText,
  Settings,
  Grid,
  Tag,
}

export function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || LayoutDashboard
}
