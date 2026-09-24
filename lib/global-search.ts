// Where the top-bar Global Search (components/layout/global-search.tsx) is
// shown. Every page gets exactly ONE intentional search system:
//
//   - Global Search on the dashboards and Meetings — cross-dataset discovery
//     (projects, tasks, people, meetings) with no competing local search.
//   - A page-local search (and no Global Search) where the page filters its
//     own dataset: Projects, Tasks, Teams, Kanban, and the admin/super-admin
//     list pages — two inputs searching the same data would be redundant.
//   - No search at all on pages with nothing to search: Calendar, Profile,
//     Credits, Performance, Leaderboard, Analytics, Settings, Account,
//     Billing, Organization, and project detail.
//
// An allow-list (not a deny-list) so a newly added page never silently gets
// a second search bar.
const GLOBAL_SEARCH_PATHS = new Set(["/overview", "/meetings", "/admin", "/superadmin"]);

export function showsGlobalSearch(pathname: string): boolean {
  return GLOBAL_SEARCH_PATHS.has(pathname.replace(/\/+$/, "") || "/");
}
