"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, FolderKanban, ListChecks, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/components/workspace/workspace-provider";

const MAX_RESULTS_PER_GROUP = 4;

/**
 * Client-side substring search over data already loaded by useWorkspace()
 * (projects/tasks/members/meetings — all already org- or self-scoped by
 * their own subscriptions, so results never leak across organizations or
 * show a meeting the signed-in user isn't part of). Deliberately not a
 * dedicated full-text search service (Algolia/Typesense/...): this app's
 * per-organization data volume doesn't justify a paid external index, and
 * this same in-memory approach is what the rest of this app already uses
 * (e.g. project/task filtering). Comments are intentionally NOT indexed —
 * there's no per-comment destination to navigate to (comments live inside a
 * task/project's dialog, not their own page), so a comment match would only
 * ever redirect to its parent anyway; searching by task/project title
 * already covers that case.
 */
export function GlobalSearch() {
  const { projects, tasks, members: teamMembers, meetings } = useWorkspace();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const matchedProjects = projects
      .filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP);

    const matchedTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP);

    const matchedMembers = teamMembers
      .filter((m) => `${m.name} ${m.title} ${m.email}`.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP);

    const matchedMeetings = meetings
      .filter((m) => `${m.title} ${m.description}`.toLowerCase().includes(q))
      .slice(0, MAX_RESULTS_PER_GROUP);

    return { matchedProjects, matchedTasks, matchedMembers, matchedMeetings };
  }, [query, projects, tasks, teamMembers, meetings]);

  const hasResults =
    results &&
    (results.matchedProjects.length || results.matchedTasks.length || results.matchedMembers.length || results.matchedMeetings.length);

  function closeAndReset() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative min-w-0 w-full max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search projects, tasks, people..."
        className="pl-9"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeAndReset();
        }}
        role="combobox"
        aria-expanded={open && Boolean(results)}
        aria-label="Global search"
      />

      {open && results && (
        <div className="absolute top-full left-0 z-50 mt-1.5 max-h-96 w-full overflow-y-auto rounded-lg bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {!hasResults && (
            <p className="px-2.5 py-4 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {results.matchedProjects.length > 0 && (
            <div className="mb-1">
              <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">Projects</p>
              {results.matchedProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  onClick={closeAndReset}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted"
                >
                  <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </div>
          )}

          {results.matchedTasks.length > 0 && (
            <div className="mb-1">
              <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">Tasks</p>
              {results.matchedTasks.map((task) => (
                <Link
                  key={task.id}
                  href="/tasks"
                  onClick={closeAndReset}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted"
                >
                  <ListChecks className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{task.title}</span>
                </Link>
              ))}
            </div>
          )}

          {results.matchedMembers.length > 0 && (
            <div className="mb-1">
              <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">Team</p>
              {results.matchedMembers.map((member) => (
                <Link
                  key={member.id}
                  href="/team"
                  onClick={closeAndReset}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted"
                >
                  <Users className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{member.name}</span>
                </Link>
              ))}
            </div>
          )}

          {results.matchedMeetings.length > 0 && (
            <div>
              <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">Meetings</p>
              {results.matchedMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href="/meetings"
                  onClick={closeAndReset}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted"
                >
                  <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{meeting.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
