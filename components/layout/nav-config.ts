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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "My Tasks", href: "/tasks", icon: ListChecks },
  { label: "Kanban", href: "/kanban", icon: KanbanSquare },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Meetings", href: "/meetings", icon: CalendarClock },
  { label: "Team", href: "/team", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
