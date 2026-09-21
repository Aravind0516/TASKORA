import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  KanbanSquare,
  CalendarDays,
  CalendarClock,
  Users,
  BarChart3,
  Settings,
  IdCard,
  Coins,
  Trophy,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional section label rendered above this item when it differs from the previous item's group — used by the Admin/Super Admin console nav (see components/platform/nav-config.ts) to organize a long flat list into labeled sections. Unused by the regular workspace sidebar, which stays a single flat list. */
  group?: string;
}

export const navItems: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "My Tasks", href: "/tasks", icon: ListChecks },
  { label: "Kanban", href: "/kanban", icon: KanbanSquare },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Meetings", href: "/meetings", icon: CalendarClock },
  { label: "Team", href: "/team", icon: Users },
  { label: "My Profile", href: "/profile", icon: IdCard },
  { label: "My Credits", href: "/credits", icon: Coins },
  { label: "My Performance", href: "/performance", icon: LineChart },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
