# TASKORA — Project Specification

## Product Description

TASKORA is an Intelligent Project Workflow & Team Collaboration Platform — a premium SaaS-style web application that helps users manage projects, tasks, teams, deadlines, workflows, productivity, and project progress from one centralized platform.

- **Name:** Taskora
- **Tagline:** Intelligent Project Workflow & Team Collaboration Platform
- **Domain:** Enterprise SaaS / Project Management / AI-Assisted Collaboration

## Delivery Goal

A polished, working MVP ready for demonstration and delivery by tomorrow afternoon. Priority order:

1. Working functionality
2. Premium UI
3. Clean architecture
4. Stable deployment
5. Core modules

Do not over-engineer advanced enterprise features.

## Locked Technology Stack

Do not change this stack without asking.

- **Frontend:** Next.js, App Router, TypeScript
- **UI:** Tailwind CSS, shadcn/ui, Lucide React icons
- **Backend:** Next.js Route Handlers, server-side services where required
- **Database:** Firebase Cloud Firestore
- **Authentication:** Firebase Authentication
- **Storage:** Firebase Cloud Storage (only if required)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **AI:** Provider-agnostic AI service layer, secure server-side integration, development fallback if API is unavailable
- **Testing:** Basic functional testing, production build verification
- **Version Control:** Git + GitHub
- **Deployment:** Vercel

## Development Principles

1. Build incrementally.
2. Do not generate unnecessary code.
3. Do not add unnecessary dependencies.
4. Use reusable components.
5. Use strict TypeScript practices.
6. Keep Firebase operations inside dedicated service files.
7. Never expose secret keys.
8. Use environment variables.
9. Do not break existing functionality.
10. Verify the application after each major module.
11. Prioritize a working MVP over advanced features.
12. Before major implementation, state which files will be created or modified.

## MVP Modules

1. Authentication
2. Dashboard
3. Project Management
4. Task Management
5. Kanban Workflow
6. Basic Team Management
7. Activity Feed
8. Analytics
9. AI Task Planner
10. Firebase Integration
11. Vercel Deployment Readiness

## Priority Order

**P0 — Critical**
- Premium application UI
- Authentication
- Project Management
- Task Management
- Kanban
- Dashboard
- Firebase integration

**P1 — Important**
- Analytics
- Activity Feed
- Basic Team Management

**P2 — Optional if time remains**
- AI Task Planner
- File uploads
- Advanced notifications
- Real-time collaboration

## User Roles

MVP roles (simple, not enterprise RBAC):

- Admin
- Project Manager
- Team Member

## Main Application Navigation

Sidebar:

- Overview
- Projects
- My Tasks
- Kanban
- Team
- Analytics
- Settings

## Dashboard Requirements

Display:

- Active Projects
- Total Tasks
- Completed Tasks
- Completion Rate
- Overdue Tasks

Also include:

- Recent Activity
- Upcoming Deadlines
- Project Progress
- Task Distribution

Use mock data initially if Firebase is not yet connected; replace with real Firestore data after Firebase integration.

## Project Management

Features: Create Project, View Projects, View Project Details, Edit Project, Archive Project.

**Project fields:** id, name, description, status, priority, progress, startDate, dueDate, ownerId, memberIds, createdAt, updatedAt

**Statuses:** Planning, Active, On Hold, Completed
**Priorities:** Low, Medium, High, Critical

## Task Management

Features: Create Task, Edit Task, Delete Task, Assign Task, Update Status, Set Priority, Set Due Date, Filter Tasks.

**Task fields:** id, projectId, title, description, status, priority, assignedTo, dueDate, createdAt, updatedAt

**Statuses:** Backlog, To Do, In Progress, In Review, Completed
**Priorities:** Low, Medium, High, Critical

## Kanban Workflow

Columns: Backlog, To Do, In Progress, In Review, Completed.

First implement reliable status updates. Drag and drop is optional and should only be added once the core application is stable.

## Basic Team Management

Features: Create Team, View Team, Add Members, Display Member Role, Remove Members. Keep this simple.

## Activity Log

Track: Project created, Project updated, Task created, Task status changed, Task completed.

Display activity on: Dashboard, Project Details page.

## Analytics

Show: Project Progress, Task Status Distribution, Completion Trends, Priority Distribution, Overdue Tasks. Built with Recharts.

## AI Task Planner

Optional until core modules are complete.

User enters a high-level requirement (e.g. "Build a student authentication system"). The AI generates:

- Task Title
- Description
- Suggested Priority
- Estimated Complexity

The AI provider must be isolated behind a service layer. The browser must never directly expose an AI API key. If no AI API is configured, provide a clearly labelled development fallback response for demonstration.

## Firebase Collections

Initial collections: users, projects, tasks, teams, comments, activity_logs.

Keep the Firestore architecture simple and scalable.

## Security

- Firebase Authentication
- Protected routes
- Firestore security rules
- Input validation (Zod)
- Environment variables
- Secure server-side API calls

## Design Direction

TASKORA must look like a premium modern SaaS product.

Principles: modern, minimal, professional, enterprise-style, clean spacing, excellent typography, responsive, premium dashboard, avoid generic college-project appearance. Use sophisticated visual hierarchy. Avoid excessive gradients or unnecessary animations.

## Development Roadmap

1. Project initialization and architecture
2. Premium UI and application shell
3. Firebase configuration
4. Authentication
5. Project Management
6. Task Management
7. Kanban Workflow
8. Dashboard with real data
9. Analytics
10. Basic Team Management and Activity Feed
11. AI Task Planner if time permits
12. Testing and Vercel deployment
