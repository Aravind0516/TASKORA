"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ListChecks, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TaskFormDialog } from "@/components/admin/task-form-dialog";
import { formatDate, isOverdue } from "@/lib/format";
import { usePlatform } from "@/components/platform/platform-provider";
import type { PlatformPriority, PlatformTask } from "@/types/platform";
import type { PlatformTaskFormValues } from "@/lib/validation/platform-task.schema";

type TabKey = "all" | "assigned" | "unassigned" | "overdue" | "completed" | "in_progress";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Assigned" },
  { key: "unassigned", label: "Unassigned" },
  { key: "overdue", label: "Overdue" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export function AdminTasksView() {
  const [loading, setLoading] = useState(true);
  const { currentOrganizationId, tasksInOrg, projectsInOrg, usersInOrg, getProject, getUser, createTask, updateTask, deleteTask } = usePlatform();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PlatformPriority | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlatformTask | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tasks = tasksInOrg(currentOrganizationId);
  const projects = projectsInOrg(currentOrganizationId);
  const users = usersInOrg(currentOrganizationId);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 3500);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (tab === "assigned" && !t.assigneeId) return false;
      if (tab === "unassigned" && t.assigneeId) return false;
      if (tab === "overdue" && !isOverdue(t.dueDate, t.status === "Completed")) return false;
      if (tab === "completed" && t.status !== "Completed") return false;
      if (tab === "in_progress" && t.status !== "In Progress") return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, tab, priorityFilter, search]);

  function openCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEdit(task: PlatformTask) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleSubmit(values: PlatformTaskFormValues) {
    if (!currentOrganizationId) return;
    const payload = {
      ...values,
      assigneeId: values.assigneeId ?? null,
      reviewerId: values.reviewerId ?? null,
      estimatedHours: values.estimatedHours ?? null,
      actualHours: values.actualHours ?? null,
      organizationId: currentOrganizationId,
    };
    if (editingTask) {
      updateTask(editingTask.id, payload);
      setSuccessMessage(`"${values.title}" was updated.`);
    } else {
      createTask(payload);
      setSuccessMessage(`"${values.title}" was created.`);
    }
  }

  function handleDelete(task: PlatformTask) {
    const confirmed = window.confirm(`Delete "${task.title}"? This can't be undone.`);
    if (!confirmed) return;
    deleteTask(task.id);
    setSuccessMessage(`"${task.title}" was deleted.`);
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Organization-wide task visibility"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Create Task
          </Button>
        }
      />

      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-[#0ca30c]/10 px-4 py-2.5 text-sm text-[#0ca30c]">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab((v as TabKey) ?? "all")}>
        <TabsList className="mb-4 flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search tasks..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter((v ?? "all") as PlatformPriority | "all")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : filtered.length === 0 ? (
            <EmptyState icon={ListChecks} title="No tasks found" description="Try a different filter, or create a new task." actionLabel="Create Task" onAction={openCreate} />
          ) : (
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((task) => {
                    const project = getProject(task.projectId);
                    const assignee = task.assigneeId ? getUser(task.assigneeId) : undefined;
                    const overdue = isOverdue(task.dueDate, task.status === "Completed");
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="whitespace-normal font-medium text-foreground">{task.title}</TableCell>
                        <TableCell className="text-muted-foreground">{project?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{assignee?.name ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <PriorityBadge priority={task.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={task.status} />
                        </TableCell>
                        <TableCell className={overdue ? "font-medium text-[#d03b3b]" : "text-muted-foreground"}>
                          {formatDate(task.dueDate)}
                          {overdue && " · Overdue"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${task.title}`} />}>
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(task)}>
                                <Pencil />
                                Edit
                              </DropdownMenuItem>
                              {task.status !== "Completed" && (
                                <DropdownMenuItem onClick={() => updateTask(task.id, { status: "Completed" })}>
                                  <CheckCircle2 />
                                  Mark complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem variant="destructive" onClick={() => handleDelete(task)}>
                                <Trash2 />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TaskFormDialog key={editingTask?.id ?? "new"} open={formOpen} onOpenChange={setFormOpen} onSubmitTask={handleSubmit} projects={projects} users={users} task={editingTask} />
    </div>
  );
}
