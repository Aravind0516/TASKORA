export interface Notification {
  id: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
}

export const notifications: Notification[] = [
  {
    id: "notif-1",
    title: "Task due today",
    message: '"Audit logging for auth events" is due today.',
    href: "/tasks",
    createdAt: "2026-09-04T08:00:00.000Z",
    read: false,
  },
  {
    id: "notif-2",
    title: "Status changed",
    message: '"Implement dual-write to new ledger" moved to In Progress.',
    href: "/projects/proj-2",
    createdAt: "2026-09-03T16:20:00.000Z",
    read: false,
  },
  {
    id: "notif-3",
    title: "Task assigned to you",
    message: '"Reconciliation report for legacy vs. new ledger" was assigned to you.',
    href: "/tasks",
    createdAt: "2026-09-01T13:10:00.000Z",
    read: false,
  },
  {
    id: "notif-4",
    title: "Project updated",
    message: '"Customer Portal Redesign" due date was changed.',
    href: "/projects/proj-1",
    createdAt: "2026-09-03T11:00:00.000Z",
    read: true,
  },
  {
    id: "notif-5",
    title: "New project created",
    message: '"Mobile App v2.0" was created.',
    href: "/projects/proj-3",
    createdAt: "2026-08-30T16:45:00.000Z",
    read: true,
  },
];
