import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Users,
  FolderKanban,
  UsersRound,
  Activity,
  BarChart3,
  ServerCog,
  Settings,
  ListChecks,
  CreditCard,
  Coins,
  Receipt,
  FileCheck2,
  CalendarClock,
  CalendarDays,
  Trophy,
  IdCard,
  ClipboardCheck,
} from "lucide-react";
import type { NavItem } from "@/components/layout/nav-config";

// Grouped into labeled sections (see PlatformSidebarNav) so the Admin
// console reads as an Organization Administrator console, not a flat list
// that happens to also contain a personal "Profile" link — the exact
// complaint this structure exists to fix. Every href here is a route that
// already exists; nothing here is a placeholder for a feature that doesn't
// exist yet (no "Roles & Permissions," "Requirements," "Announcements," or
// "Audit Logs" entries — those aren't real pages in this codebase today).
export const ADMIN_NAV: NavItem[] = [
  { label: "Command Center", href: "/admin", icon: LayoutDashboard, group: "Organization" },
  { label: "Organization", href: "/admin/organization", icon: Building2, group: "Organization" },
  { label: "Users", href: "/admin/users", icon: Users, group: "Organization" },
  { label: "Teams", href: "/admin/teams", icon: UsersRound, group: "Organization" },

  { label: "Projects", href: "/admin/projects", icon: FolderKanban, group: "Work Management" },
  { label: "Tasks", href: "/admin/tasks", icon: ListChecks, group: "Work Management" },
  { label: "Work Verification", href: "/admin/work-verification", icon: FileCheck2, group: "Work Management" },
  { label: "Meetings", href: "/meetings", icon: CalendarClock, group: "Work Management" },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, group: "Work Management" },

  { label: "Credits", href: "/admin/credits", icon: Coins, group: "People & Performance" },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy, group: "People & Performance" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, group: "People & Performance" },

  { label: "Billing", href: "/admin/billing", icon: CreditCard, group: "Administration" },
  { label: "Activity", href: "/admin/activity", icon: Activity, group: "Administration" },
  { label: "Settings", href: "/admin/settings", icon: Settings, group: "Administration" },

  { label: "Admin Account", href: "/admin/account", icon: IdCard, group: "Account" },
];

export const SUPER_ADMIN_NAV: NavItem[] = [
  { label: "Command Center", href: "/superadmin", icon: LayoutDashboard, group: "Platform" },
  { label: "Organizations", href: "/superadmin/organizations", icon: Building2, group: "Platform" },
  { label: "Organization Requests", href: "/superadmin/organization-requests", icon: ClipboardCheck, group: "Platform" },
  { label: "Administrators", href: "/superadmin/admins", icon: ShieldCheck, group: "Platform" },

  { label: "Users", href: "/superadmin/users", icon: Users, group: "Operations" },
  { label: "Projects", href: "/superadmin/projects", icon: FolderKanban, group: "Operations" },
  { label: "Teams", href: "/superadmin/teams", icon: UsersRound, group: "Operations" },

  { label: "Subscriptions", href: "/superadmin/subscriptions", icon: Receipt, group: "Business" },
  { label: "Analytics", href: "/superadmin/analytics", icon: BarChart3, group: "Business" },

  { label: "Activity", href: "/superadmin/activity", icon: Activity, group: "System" },
  { label: "System", href: "/superadmin/system", icon: ServerCog, group: "System" },
  { label: "Settings", href: "/superadmin/settings", icon: Settings, group: "System" },

  { label: "Admin Account", href: "/superadmin/account", icon: IdCard, group: "Account" },
];
