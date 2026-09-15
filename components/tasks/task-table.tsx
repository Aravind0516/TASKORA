"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatDate, isOverdue } from "@/lib/format";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { TASK_STATUSES, type Task, type TaskPriority, type TaskStatus } from "@/types/task";

const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

interface TaskTableProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  emptyMessage?: string;
}

export function TaskTable({ tasks, onEdit, onDelete, emptyMessage = "No tasks yet." }: TaskTableProps) {
  const { getProjectById } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");

  const showActions = Boolean(onEdit || onDelete);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (status !== "all" && task.status !== status) return false;
      if (priority !== "all" && task.priority !== priority) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, search, status, priority]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Task</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              {showActions && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={showActions ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                  {tasks.length === 0 ? emptyMessage : "No tasks match your filters."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((task) => {
              const project = getProjectById(task.projectId);
              const overdue = isOverdue(task.dueDate, task.status === "Completed");

              return (
                <TableRow
                  key={task.id}
                  className={onEdit ? "cursor-pointer" : undefined}
                  onClick={onEdit ? () => onEdit(task) : undefined}
                >
                  <TableCell className="whitespace-normal font-medium text-foreground">
                    {task.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{project?.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={task.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={task.priority} />
                  </TableCell>
                  <TableCell className={overdue ? "font-medium text-[#d03b3b]" : "text-muted-foreground"}>
                    {formatDate(task.dueDate)}
                    {overdue && " · Overdue"}
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${task.title}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(task)}>
                              <Pencil />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
