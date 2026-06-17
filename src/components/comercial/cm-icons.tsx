"use client"

// Icon set for the Comercial module — design icon names mapped to lucide-react.
import {
  AlertTriangle,
  ArrowRight,
  BarChart,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code,
  Coins,
  Copy,
  Download,
  Filter,
  FileText,
  Home,
  Inbox,
  type LucideIcon,
  Megaphone,
  MoreHorizontal,
  MousePointer,
  Paperclip,
  Pencil,
  Percent,
  PieChart,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react"

const ICONS = {
  home: Home,
  funnel: Filter,
  megaphone: Megaphone,
  users: Users,
  download: Download,
  coins: Coins,
  userPlus: UserPlus,
  plus: Plus,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  handshake: CheckCircle2,
  percent: Percent,
  target: Target,
  user: User,
  mousePointerClick: MousePointer,
  receipt: Receipt,
  banknote: Banknote,
  arrowRight: ArrowRight,
  alertTriangle: AlertTriangle,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  x: X,
  inbox: Inbox,
  calendar: Calendar,
  search: Search,
  upload: Upload,
  history: Clock,
  fileSpreadsheet: FileText,
  braces: Code,
  barChart: BarChart,
  pieChart: PieChart,
  sparkles: Sparkles,
  copy: Copy,
  check: Check,
  checkCircle: CheckCircle2,
  edit: Pencil,
  refreshCw: RefreshCw,
  moreHorizontal: MoreHorizontal,
  wallet: Wallet,
  paperclip: Paperclip,
} satisfies Record<string, LucideIcon>

export type CmIconName = keyof typeof ICONS

export function Icon({
  name,
  size = 15,
  strokeWidth = 1.9,
  className,
  style,
}: {
  name: CmIconName
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}) {
  const C = ICONS[name]
  return <C size={size} strokeWidth={strokeWidth} className={className} style={style} />
}
