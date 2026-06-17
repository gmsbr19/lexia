"use client"

// Icon set for the Tarefas module — design icon names mapped to lucide-react.
import {
  Bell,
  Briefcase,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileText,
  Flag,
  Flame,
  Funnel,
  Gavel,
  GripVertical,
  Inbox,
  Kanban,
  LayoutGrid,
  Link2,
  List,
  ListChecks,
  ListTodo,
  type LucideIcon,
  Moon,
  Plus,
  Repeat,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
} from "lucide-react"

const ICONS = {
  plus: Plus,
  calendar: Calendar,
  calendarClock: CalendarClock,
  flag: Flag,
  flame: Flame,
  sparkles: Sparkles,
  listChecks: ListChecks,
  listTodo: ListTodo,
  check: Check,
  checkCircle: CheckCircle2,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  layoutGrid: LayoutGrid,
  user: User,
  inbox: Inbox,
  sun: Sun,
  moon: Moon,
  list: List,
  kanban: Kanban,
  repeat: Repeat,
  bell: Bell,
  gripVertical: GripVertical,
  briefcase: Briefcase,
  gavel: Gavel,
  x: X,
  link2: Link2,
  fileText: FileText,
  trash2: Trash2,
  circleDot: CircleDot,
  funnel: Funnel,
} satisfies Record<string, LucideIcon>

export type TfIconName = keyof typeof ICONS

export function Icon({
  name,
  size = 15,
  strokeWidth = 1.9,
  className,
  style,
}: {
  name: TfIconName
  size?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}) {
  const C = ICONS[name]
  return <C size={size} strokeWidth={strokeWidth} className={className} style={style} />
}
