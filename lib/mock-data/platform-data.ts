// Centralized mock data for the Super Admin / Admin platform experience.
// Frontend-only for this phase — see CLAUDE.md. Every entity below models
// what the eventual Firestore documents will look like (organizationId /
// teamId / ownerId / assigneeId foreign keys) so swapping this file for
// real services later doesn't require touching the pages that consume it.

import type {
  Organization,
  PlatformAdmin,
  PlatformUser,
  PlatformTeam,
  PlatformProject,
  PlatformTask,
  PlatformActivityEntry,
  SystemServiceStatus,
} from "@/types/platform";

export const organizations: Organization[] = [
  {
    id: "org-1",
    name: "Northwind Robotics",
    description: "Autonomous warehouse robotics and precision actuator systems.",
    industry: "Robotics & Automation",
    contactEmail: "ops@northwindrobotics.io",
    plan: "Pro",
    status: "Active",
    adminId: "padmin-1",
    createdAt: "2025-11-02T09:00:00.000Z",
    lastActivityAt: "2026-09-05T07:40:00.000Z",
  },
  {
    id: "org-2",
    name: "Cascade Analytics",
    description: "Realtime data platforms and customer analytics for mid-market SaaS.",
    industry: "Data & Analytics",
    contactEmail: "hello@cascadeanalytics.io",
    plan: "Business",
    status: "Active",
    adminId: "padmin-2",
    createdAt: "2025-08-14T09:00:00.000Z",
    lastActivityAt: "2026-09-05T06:15:00.000Z",
  },
  {
    id: "org-3",
    name: "Solstice Studios",
    description: "Brand, product design, and design systems consultancy.",
    industry: "Creative & Design",
    contactEmail: "studio@solsticestudios.co",
    plan: "Free",
    status: "Active",
    adminId: "padmin-3",
    createdAt: "2026-03-21T09:00:00.000Z",
    lastActivityAt: "2026-09-04T18:20:00.000Z",
  },
  {
    id: "org-4",
    name: "Ironclad Logistics",
    description: "Fleet telemetry and warehouse automation for cold-chain logistics.",
    industry: "Supply Chain",
    contactEmail: "it@ironcladlogistics.com",
    plan: "Pro",
    status: "Suspended",
    adminId: "padmin-4",
    createdAt: "2025-05-30T09:00:00.000Z",
    lastActivityAt: "2026-08-22T11:00:00.000Z",
  },
];

export const platformAdmins: PlatformAdmin[] = [
  {
    id: "padmin-1",
    organizationId: "org-1",
    name: "Morgan Blake",
    email: "morgan.blake@northwindrobotics.io",
    status: "Active",
    joinedAt: "2025-11-02T09:00:00.000Z",
    lastActiveAt: "2026-09-05T07:40:00.000Z",
  },
  {
    id: "padmin-2",
    organizationId: "org-2",
    name: "Priya Anand",
    email: "priya.anand@cascadeanalytics.io",
    status: "Active",
    joinedAt: "2025-08-14T09:00:00.000Z",
    lastActiveAt: "2026-09-05T06:15:00.000Z",
  },
  {
    id: "padmin-3",
    organizationId: "org-3",
    name: "Jordan Reyes",
    email: "jordan@solsticestudios.co",
    status: "Active",
    joinedAt: "2026-03-21T09:00:00.000Z",
    lastActiveAt: "2026-09-04T18:20:00.000Z",
  },
  {
    id: "padmin-4",
    organizationId: "org-4",
    name: "Sam Whitfield",
    email: "sam.whitfield@ironcladlogistics.com",
    status: "Suspended",
    joinedAt: "2025-05-30T09:00:00.000Z",
    lastActiveAt: "2026-08-22T11:00:00.000Z",
  },
];

export const platformUsers: PlatformUser[] = [
  { id: "puser-1", organizationId: "org-1", name: "Elena Cho", email: "elena.cho@northwindrobotics.io", title: "Lead Hardware Engineer", teamIds: ["pteam-1"], projectIds: ["pproj-1"], status: "Active", joinedAt: "2025-11-05T09:00:00.000Z", lastActiveAt: "2026-09-05T07:10:00.000Z" },
  { id: "puser-2", organizationId: "org-1", name: "Marcus Webb", email: "marcus.webb@northwindrobotics.io", title: "Mechanical Engineer", teamIds: ["pteam-1"], projectIds: ["pproj-1"], status: "Active", joinedAt: "2025-11-10T09:00:00.000Z", lastActiveAt: "2026-09-04T16:30:00.000Z" },
  { id: "puser-3", organizationId: "org-1", name: "Tara Singh", email: "tara.singh@northwindrobotics.io", title: "Lead Firmware Engineer", teamIds: ["pteam-2"], projectIds: ["pproj-2"], status: "Active", joinedAt: "2025-12-01T09:00:00.000Z", lastActiveAt: "2026-09-05T05:50:00.000Z" },
  { id: "puser-4", organizationId: "org-1", name: "Devon Ellis", email: "devon.ellis@northwindrobotics.io", title: "Firmware Engineer", teamIds: ["pteam-2"], projectIds: ["pproj-2"], status: "Active", joinedAt: "2026-01-15T09:00:00.000Z", lastActiveAt: "2026-09-03T14:00:00.000Z" },
  { id: "puser-5", organizationId: "org-1", name: "Nadia Farouk", email: "nadia.farouk@northwindrobotics.io", title: "QA Engineer", teamIds: ["pteam-1", "pteam-2"], projectIds: ["pproj-1", "pproj-2"], status: "Invited", joinedAt: "2026-08-28T09:00:00.000Z", lastActiveAt: "2026-08-28T09:00:00.000Z" },

  { id: "puser-6", organizationId: "org-2", name: "Owen Marsh", email: "owen.marsh@cascadeanalytics.io", title: "Lead Data Engineer", teamIds: ["pteam-3"], projectIds: ["pproj-3", "pproj-10"], status: "Active", joinedAt: "2025-08-18T09:00:00.000Z", lastActiveAt: "2026-09-05T06:00:00.000Z" },
  { id: "puser-7", organizationId: "org-2", name: "Bianca Reyes", email: "bianca.reyes@cascadeanalytics.io", title: "Data Engineer", teamIds: ["pteam-3"], projectIds: ["pproj-3"], status: "Active", joinedAt: "2025-09-02T09:00:00.000Z", lastActiveAt: "2026-09-04T12:20:00.000Z" },
  { id: "puser-8", organizationId: "org-2", name: "Felix Huang", email: "felix.huang@cascadeanalytics.io", title: "Lead Product Analyst", teamIds: ["pteam-4"], projectIds: ["pproj-4"], status: "Active", joinedAt: "2025-10-06T09:00:00.000Z", lastActiveAt: "2026-09-05T04:45:00.000Z" },
  { id: "puser-9", organizationId: "org-2", name: "Grace Oyelaran", email: "grace.oyelaran@cascadeanalytics.io", title: "Product Analyst", teamIds: ["pteam-4"], projectIds: ["pproj-4"], status: "Active", joinedAt: "2026-02-11T09:00:00.000Z", lastActiveAt: "2026-09-02T10:00:00.000Z" },
  { id: "puser-10", organizationId: "org-2", name: "Theo Nakamura", email: "theo.nakamura@cascadeanalytics.io", title: "Data Governance Lead", teamIds: ["pteam-3"], projectIds: ["pproj-10"], status: "Active", joinedAt: "2026-04-20T09:00:00.000Z", lastActiveAt: "2026-09-01T09:30:00.000Z" },

  { id: "puser-11", organizationId: "org-3", name: "Iris Delgado", email: "iris@solsticestudios.co", title: "Lead Product Designer", teamIds: ["pteam-5"], projectIds: ["pproj-6"], status: "Active", joinedAt: "2026-03-24T09:00:00.000Z", lastActiveAt: "2026-09-04T17:00:00.000Z" },
  { id: "puser-12", organizationId: "org-3", name: "Jonah Petrov", email: "jonah@solsticestudios.co", title: "Product Designer", teamIds: ["pteam-5"], projectIds: ["pproj-6"], status: "Active", joinedAt: "2026-04-02T09:00:00.000Z", lastActiveAt: "2026-09-03T15:40:00.000Z" },
  { id: "puser-13", organizationId: "org-3", name: "Lucia Marchetti", email: "lucia@solsticestudios.co", title: "Lead Brand Designer", teamIds: ["pteam-6"], projectIds: ["pproj-5"], status: "Active", joinedAt: "2026-03-24T09:00:00.000Z", lastActiveAt: "2026-09-04T18:20:00.000Z" },
  { id: "puser-14", organizationId: "org-3", name: "Wes Calder", email: "wes@solsticestudios.co", title: "Brand Designer", teamIds: ["pteam-6"], projectIds: ["pproj-5"], status: "Invited", joinedAt: "2026-08-30T09:00:00.000Z", lastActiveAt: "2026-08-30T09:00:00.000Z" },

  { id: "puser-16", organizationId: "org-4", name: "Priya Nair", email: "priya.nair@ironcladlogistics.com", title: "Lead Fleet Ops Engineer", teamIds: ["pteam-7"], projectIds: ["pproj-7", "pproj-9"], status: "Suspended", joinedAt: "2025-06-02T09:00:00.000Z", lastActiveAt: "2026-08-22T11:00:00.000Z" },
  { id: "puser-17", organizationId: "org-4", name: "Callum Best", email: "callum.best@ironcladlogistics.com", title: "Telemetry Engineer", teamIds: ["pteam-7"], projectIds: ["pproj-7"], status: "Suspended", joinedAt: "2025-06-10T09:00:00.000Z", lastActiveAt: "2026-08-20T09:15:00.000Z" },
  { id: "puser-18", organizationId: "org-4", name: "Renee Ashworth", email: "renee.ashworth@ironcladlogistics.com", title: "Lead Systems Engineer", teamIds: ["pteam-8"], projectIds: ["pproj-8"], status: "Suspended", joinedAt: "2025-07-01T09:00:00.000Z", lastActiveAt: "2026-08-21T13:45:00.000Z" },
  { id: "puser-19", organizationId: "org-4", name: "Malik Osei", email: "malik.osei@ironcladlogistics.com", title: "Automation Engineer", teamIds: ["pteam-8"], projectIds: ["pproj-8"], status: "Suspended", joinedAt: "2025-09-15T09:00:00.000Z", lastActiveAt: "2026-08-19T10:00:00.000Z" },
  { id: "puser-20", organizationId: "org-4", name: "Hana Kobayashi", email: "hana.kobayashi@ironcladlogistics.com", title: "Cold Chain Analyst", teamIds: ["pteam-7"], projectIds: ["pproj-9"], status: "Suspended", joinedAt: "2025-11-20T09:00:00.000Z", lastActiveAt: "2026-08-22T10:30:00.000Z" },
];

export const platformTeams: PlatformTeam[] = [
  { id: "pteam-1", organizationId: "org-1", name: "Hardware Engineering", description: "Actuator and chassis design.", leadId: "puser-1", memberIds: ["puser-1", "puser-2", "puser-5"], projectIds: ["pproj-1"], createdAt: "2025-11-02T09:00:00.000Z" },
  { id: "pteam-2", organizationId: "org-1", name: "Firmware", description: "Embedded firmware and OTA delivery.", leadId: "puser-3", memberIds: ["puser-3", "puser-4", "puser-5"], projectIds: ["pproj-2"], createdAt: "2025-11-20T09:00:00.000Z" },
  { id: "pteam-3", organizationId: "org-2", name: "Data Platform", description: "Ingestion, streaming, and governance.", leadId: "puser-6", memberIds: ["puser-6", "puser-7", "puser-10"], projectIds: ["pproj-3", "pproj-10"], createdAt: "2025-08-14T09:00:00.000Z" },
  { id: "pteam-4", organizationId: "org-2", name: "Insights", description: "Customer-facing analytics and reporting.", leadId: "puser-8", memberIds: ["puser-8", "puser-9"], projectIds: ["pproj-4"], createdAt: "2025-10-06T09:00:00.000Z" },
  { id: "pteam-5", organizationId: "org-3", name: "Product Design", description: "Design systems and product UX.", leadId: "puser-11", memberIds: ["puser-11", "puser-12"], projectIds: ["pproj-6"], createdAt: "2026-03-24T09:00:00.000Z" },
  { id: "pteam-6", organizationId: "org-3", name: "Brand", description: "Brand identity and rebrand delivery.", leadId: "puser-13", memberIds: ["puser-13", "puser-14"], projectIds: ["pproj-5"], createdAt: "2026-03-24T09:00:00.000Z" },
  { id: "pteam-7", organizationId: "org-4", name: "Fleet Ops", description: "Vehicle telemetry and cold-chain monitoring.", leadId: "puser-16", memberIds: ["puser-16", "puser-17", "puser-20"], projectIds: ["pproj-7", "pproj-9"], createdAt: "2025-06-02T09:00:00.000Z" },
  { id: "pteam-8", organizationId: "org-4", name: "Warehouse Systems", description: "Warehouse automation and robotics integration.", leadId: "puser-18", memberIds: ["puser-18", "puser-19"], projectIds: ["pproj-8"], createdAt: "2025-07-01T09:00:00.000Z" },
];

export const platformProjects: PlatformProject[] = [
  { id: "pproj-1", organizationId: "org-1", teamId: "pteam-1", name: "Gen3 Actuator Platform", description: "Next-generation actuator module for warehouse arms.", ownerId: "puser-1", managerId: null, memberIds: [], status: "Active", priority: "High", progress: 62, startDate: "2026-06-01", dueDate: "2026-10-15", archived: false, createdAt: "2026-05-20T09:00:00.000Z", updatedAt: "2026-09-03T10:00:00.000Z" },
  { id: "pproj-2", organizationId: "org-1", teamId: "pteam-2", name: "Firmware OTA Rollout", description: "Staged OTA firmware delivery across the robotics fleet.", ownerId: "puser-3", managerId: null, memberIds: [], status: "Active", priority: "Critical", progress: 40, startDate: "2026-07-01", dueDate: "2026-09-20", archived: false, createdAt: "2026-06-15T09:00:00.000Z", updatedAt: "2026-09-04T09:00:00.000Z" },
  { id: "pproj-3", organizationId: "org-2", teamId: "pteam-3", name: "Realtime Analytics Pipeline", description: "Streaming ingestion pipeline for customer event data.", ownerId: "puser-6", managerId: null, memberIds: [], status: "Active", priority: "High", progress: 78, startDate: "2026-04-01", dueDate: "2026-09-25", archived: false, createdAt: "2026-03-20T09:00:00.000Z", updatedAt: "2026-09-05T08:00:00.000Z" },
  { id: "pproj-4", organizationId: "org-2", teamId: "pteam-4", name: "Customer Insights Portal", description: "Self-serve analytics portal for enterprise customers.", ownerId: "puser-8", managerId: null, memberIds: [], status: "Planning", priority: "Medium", progress: 15, startDate: "2026-09-01", dueDate: "2026-12-15", archived: false, createdAt: "2026-08-20T09:00:00.000Z", updatedAt: "2026-09-02T09:00:00.000Z" },
  { id: "pproj-10", organizationId: "org-2", teamId: "pteam-3", name: "Data Governance Audit", description: "Compliance audit and access-control cleanup.", ownerId: "puser-10", managerId: null, memberIds: [], status: "On Hold", priority: "Low", progress: 25, startDate: "2026-05-01", dueDate: "2026-09-30", archived: false, createdAt: "2026-04-25T09:00:00.000Z", updatedAt: "2026-08-28T09:00:00.000Z" },
  { id: "pproj-5", organizationId: "org-3", teamId: "pteam-6", name: "Aurora Rebrand", description: "Full brand identity refresh for a fintech client.", ownerId: "puser-13", managerId: null, memberIds: [], status: "Active", priority: "High", progress: 55, startDate: "2026-07-15", dueDate: "2026-09-10", archived: false, createdAt: "2026-07-01T09:00:00.000Z", updatedAt: "2026-09-04T14:00:00.000Z" },
  { id: "pproj-6", organizationId: "org-3", teamId: "pteam-5", name: "Design System 2.0", description: "Componentized design system for internal product teams.", ownerId: "puser-11", managerId: null, memberIds: [], status: "Active", priority: "Medium", progress: 33, startDate: "2026-06-01", dueDate: "2026-10-01", archived: false, createdAt: "2026-05-25T09:00:00.000Z", updatedAt: "2026-09-01T09:00:00.000Z" },
  { id: "pproj-7", organizationId: "org-4", teamId: "pteam-7", name: "Fleet Telemetry Upgrade", description: "Next-gen telemetry hardware rollout across the fleet.", ownerId: "puser-16", managerId: null, memberIds: [], status: "On Hold", priority: "Medium", progress: 48, startDate: "2026-03-01", dueDate: "2026-09-30", archived: false, createdAt: "2026-02-15T09:00:00.000Z", updatedAt: "2026-08-22T09:00:00.000Z" },
  { id: "pproj-8", organizationId: "org-4", teamId: "pteam-8", name: "Warehouse Automation Rollout", description: "Automated pick-and-pack integration.", ownerId: "puser-18", managerId: null, memberIds: [], status: "On Hold", priority: "High", progress: 70, startDate: "2026-01-10", dueDate: "2026-09-15", archived: false, createdAt: "2025-12-20T09:00:00.000Z", updatedAt: "2026-08-21T09:00:00.000Z" },
  { id: "pproj-9", organizationId: "org-4", teamId: "pteam-7", name: "Cold Chain Monitoring", description: "Temperature-compliance monitoring for refrigerated freight.", ownerId: "puser-20", managerId: null, memberIds: [], status: "Completed", priority: "Critical", progress: 100, startDate: "2025-11-01", dueDate: "2026-04-01", archived: false, createdAt: "2025-10-15T09:00:00.000Z", updatedAt: "2026-04-01T09:00:00.000Z" },
];

function buildTasks(): PlatformTask[] {
  const seeds: Array<[string, string, string, PlatformTask["status"], PlatformTask["priority"], string | null, string, string]> = [
    ["ptask-1", "pproj-1", "Finalize actuator torque spec", "Completed", "High", "puser-1", "2026-08-10", "org-1"],
    ["ptask-2", "pproj-1", "Prototype gearbox housing v3", "In Progress", "High", "puser-2", "2026-09-12", "org-1"],
    ["ptask-3", "pproj-1", "Vibration stress test rig", "To Do", "Medium", "puser-5", "2026-09-20", "org-1"],
    ["ptask-4", "pproj-1", "Update BOM for supplier review", "Backlog", "Low", null, "2026-09-28", "org-1"],
    ["ptask-5", "pproj-2", "Staged rollout to pilot fleet", "In Review", "Critical", "puser-3", "2026-09-08", "org-1"],
    ["ptask-6", "pproj-2", "Rollback safety checks", "In Progress", "Critical", "puser-4", "2026-09-10", "org-1"],
    ["ptask-7", "pproj-2", "OTA telemetry dashboard", "To Do", "Medium", "puser-4", "2026-09-25", "org-1"],
    ["ptask-8", "pproj-3", "Kafka partition rebalance", "Completed", "High", "puser-6", "2026-08-18", "org-2"],
    ["ptask-9", "pproj-3", "Schema registry migration", "In Progress", "High", "puser-7", "2026-09-09", "org-2"],
    ["ptask-10", "pproj-3", "Load test at 2x peak volume", "In Review", "Medium", "puser-6", "2026-09-06", "org-2"],
    ["ptask-11", "pproj-4", "Portal information architecture", "To Do", "Medium", "puser-8", "2026-09-18", "org-2"],
    ["ptask-12", "pproj-4", "Stakeholder discovery interviews", "Backlog", "Low", "puser-9", "2026-09-30", "org-2"],
    ["ptask-13", "pproj-10", "Access-control policy review", "In Progress", "Low", "puser-10", "2026-09-14", "org-2"],
    ["ptask-14", "pproj-5", "Logo system exploration", "Completed", "High", "puser-13", "2026-08-20", "org-3"],
    ["ptask-15", "pproj-5", "Brand guidelines draft", "In Review", "High", "puser-14", "2026-09-07", "org-3"],
    ["ptask-16", "pproj-5", "Stationery + deck templates", "To Do", "Medium", "puser-13", "2026-09-16", "org-3"],
    ["ptask-17", "pproj-6", "Token architecture proposal", "In Progress", "Medium", "puser-11", "2026-09-11", "org-3"],
    ["ptask-18", "pproj-6", "Component audit across products", "Backlog", "Low", "puser-12", "2026-09-26", "org-3"],
    ["ptask-19", "pproj-7", "Sensor firmware compatibility pass", "In Progress", "Medium", "puser-17", "2026-09-05", "org-4"],
    ["ptask-20", "pproj-7", "Fleet-wide rollout schedule", "Backlog", "Medium", "puser-16", "2026-09-22", "org-4"],
    ["ptask-21", "pproj-8", "Pick-and-pack integration test", "In Review", "High", "puser-19", "2026-09-04", "org-4"],
    ["ptask-22", "pproj-8", "Downtime runbook", "To Do", "Medium", "puser-18", "2026-09-13", "org-4"],
    ["ptask-23", "pproj-9", "Final compliance sign-off", "Completed", "Critical", "puser-20", "2026-03-28", "org-4"],
  ];

  return seeds.map(([id, projectId, title, status, priority, assigneeId, dueDate, organizationId]) => ({
    id,
    organizationId,
    projectId,
    ownerId: assigneeId ?? "unknown",
    title,
    description: `${title} — tracked under ${projectId}.`,
    status,
    priority,
    assigneeId,
    dueDate,
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
  }));
}

export const platformTasks: PlatformTask[] = buildTasks();

export const platformActivity: PlatformActivityEntry[] = [
  { id: "pact-1", organizationId: "org-2", actorId: "puser-6", actorName: "Owen Marsh", action: "task_completed", entityType: "task", entityName: "Kafka partition rebalance", createdAt: "2026-09-05T07:40:00.000Z" },
  { id: "pact-2", organizationId: "org-1", actorId: "padmin-1", actorName: "Morgan Blake", action: "user_invited", entityType: "user", entityName: "Nadia Farouk", createdAt: "2026-09-05T06:20:00.000Z" },
  { id: "pact-3", organizationId: "org-3", actorId: "puser-13", actorName: "Lucia Marchetti", action: "project_created", entityType: "project", entityName: "Aurora Rebrand", createdAt: "2026-09-04T18:10:00.000Z" },
  { id: "pact-4", organizationId: "org-2", actorId: "padmin-2", actorName: "Priya Anand", action: "team_created", entityType: "team", entityName: "Insights", createdAt: "2026-09-04T15:00:00.000Z" },
  { id: "pact-5", organizationId: "org-4", actorId: "super-admin", actorName: "Platform", action: "organization_suspended", entityType: "organization", entityName: "Ironclad Logistics", createdAt: "2026-08-22T11:00:00.000Z" },
  { id: "pact-6", organizationId: "org-1", actorId: "puser-3", actorName: "Tara Singh", action: "user_assigned", entityType: "user", entityName: "Devon Ellis → Firmware OTA Rollout", createdAt: "2026-09-04T10:30:00.000Z" },
  { id: "pact-7", organizationId: "org-3", actorId: "super-admin", actorName: "Platform", action: "admin_registered", entityType: "admin", entityName: "Jordan Reyes", createdAt: "2026-03-21T09:05:00.000Z" },
  { id: "pact-8", organizationId: "org-4", actorId: "puser-20", actorName: "Hana Kobayashi", action: "project_completed", entityType: "project", entityName: "Cold Chain Monitoring", createdAt: "2026-04-01T09:00:00.000Z" },
  { id: "pact-9", organizationId: "org-2", actorId: "puser-10", actorName: "Theo Nakamura", action: "user_joined", entityType: "user", entityName: "Theo Nakamura", createdAt: "2026-04-20T09:05:00.000Z" },
  { id: "pact-10", organizationId: "org-1", actorId: "super-admin", actorName: "Platform", action: "organization_created", entityType: "organization", entityName: "Northwind Robotics", createdAt: "2025-11-02T09:05:00.000Z" },
];

export const systemServices: SystemServiceStatus[] = [
  { id: "svc-auth", name: "Authentication", status: "Healthy", uptimePct: 99.98, latencyMs: 84, lastIncidentAt: null },
  { id: "svc-db", name: "Database (Firestore)", status: "Healthy", uptimePct: 99.95, latencyMs: 112, lastIncidentAt: "2026-08-30T04:00:00.000Z" },
  { id: "svc-api", name: "Platform API", status: "Warning", uptimePct: 99.6, latencyMs: 240, lastIncidentAt: "2026-09-04T22:10:00.000Z" },
  { id: "svc-storage", name: "Storage", status: "Healthy", uptimePct: 99.99, latencyMs: 65, lastIncidentAt: null },
  { id: "svc-notifications", name: "Notifications", status: "Healthy", uptimePct: 99.9, latencyMs: 130, lastIncidentAt: null },
  { id: "svc-realtime", name: "Realtime Sync", status: "Critical", uptimePct: 97.2, latencyMs: 410, lastIncidentAt: "2026-09-05T05:00:00.000Z" },
];

// --- Lookup helpers, mirroring the existing lib/mock-data/* convention ---

export function getOrganizationById(id: string): Organization | undefined {
  return organizations.find((o) => o.id === id);
}
export function getAdminById(id: string): PlatformAdmin | undefined {
  return platformAdmins.find((a) => a.id === id);
}
export function getAdminByOrgId(organizationId: string): PlatformAdmin | undefined {
  return platformAdmins.find((a) => a.organizationId === organizationId);
}
export function getPlatformUserById(id: string): PlatformUser | undefined {
  return platformUsers.find((u) => u.id === id);
}
export function getUsersByOrgId(organizationId: string): PlatformUser[] {
  return platformUsers.filter((u) => u.organizationId === organizationId);
}
export function getTeamById(id: string): PlatformTeam | undefined {
  return platformTeams.find((t) => t.id === id);
}
export function getTeamsByOrgId(organizationId: string): PlatformTeam[] {
  return platformTeams.filter((t) => t.organizationId === organizationId);
}
export function getProjectById(id: string): PlatformProject | undefined {
  return platformProjects.find((p) => p.id === id);
}
export function getProjectsByOrgId(organizationId: string): PlatformProject[] {
  return platformProjects.filter((p) => p.organizationId === organizationId);
}
export function getTasksByProjectId(projectId: string): PlatformTask[] {
  return platformTasks.filter((t) => t.projectId === projectId);
}
export function getTasksByOrgId(organizationId: string): PlatformTask[] {
  return platformTasks.filter((t) => t.organizationId === organizationId);
}
export function getActivityByOrgId(organizationId: string): PlatformActivityEntry[] {
  return platformActivity
    .filter((a) => a.organizationId === organizationId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function getRecentActivity(limitCount = 8): PlatformActivityEntry[] {
  return [...platformActivity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limitCount);
}
