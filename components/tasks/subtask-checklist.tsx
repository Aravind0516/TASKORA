"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as subtaskService from "@/lib/services/subtask.service";
import type { Subtask } from "@/types/subtask";

// Sentinel item value for "unassigned" — Select items can't use an empty
// string as their value, same pattern used throughout this codebase.
const UNASSIGNED = "none";

interface SubtaskChecklistProps {
  taskId: string;
  organizationId: string;
  /** Kept structurally loose so both the (app)-group's TeamMember[] and the admin console's PlatformUser[] can be passed without a shared type. */
  members: Array<{ id: string; name: string }>;
}

/**
 * A lightweight checklist under a task — not shown when creating a new task
 * (there's no id yet to attach subtasks to), only once editing an existing
 * one. Manages its own scoped Firestore subscription directly via
 * lib/services/subtask.service.ts rather than going through
 * useWorkspace()/usePlatform(), since subtasks are only ever needed while
 * this one task's dialog is open — an always-on, organization-wide listener
 * for every task's subtasks would be wasted for the common case where the
 * dialog is closed. This is still "go through a service function," per
 * this repo's data-access rule — just not through the global providers.
 */
export function SubtaskChecklist({ taskId, organizationId, members }: SubtaskChecklistProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    // taskId never actually changes within one mount of this component — the
    // parent dialog is always remounted via key={task?.id ?? "new"} when the
    // edited task changes (this repo's standard convention for record-editing
    // dialogs), so this subscription effect only ever runs once per mount.
    const unsubscribe = subtaskService.subscribeToSubtasks(
      taskId,
      (data) => {
        setSubtasks(data);
        setLoaded(true);
      },
      (message) => {
        setError(message);
        setLoaded(true);
      }
    );
    return unsubscribe;
  }, [taskId]);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const progressPct = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    setError(null);
    try {
      await subtaskService.createSubtask({ organizationId, taskId, title, order: subtasks.length });
      setNewTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add subtask.");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(subtask: Subtask) {
    try {
      await subtaskService.toggleSubtaskCompleted(subtask.id, !subtask.completed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update subtask.");
    }
  }

  async function handleAssign(subtask: Subtask, assigneeId: string) {
    try {
      await subtaskService.updateSubtask(subtask.id, { assigneeId: assigneeId === UNASSIGNED ? null : assigneeId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reassign subtask.");
    }
  }

  async function handleDelete(subtask: Subtask) {
    try {
      await subtaskService.deleteSubtask(subtask.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete subtask.");
    }
  }

  return (
    <div className="space-y-2.5 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium text-foreground">Subtasks</Label>
        {subtasks.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{subtasks.length} complete
          </span>
        )}
      </div>

      {subtasks.length > 0 && <Progress value={progressPct} />}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loaded && subtasks.length === 0 && <p className="text-xs text-muted-foreground">No subtasks yet.</p>}

      {subtasks.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted">
              <Checkbox checked={subtask.completed} onCheckedChange={() => handleToggle(subtask)} />
              <span
                className={
                  subtask.completed
                    ? "min-w-0 flex-1 truncate text-sm text-muted-foreground line-through"
                    : "min-w-0 flex-1 truncate text-sm text-foreground"
                }
              >
                {subtask.title}
              </span>
              {members.length > 0 && (
                <Select value={subtask.assigneeId ?? UNASSIGNED} onValueChange={(value) => handleAssign(subtask, value ?? UNASSIGNED)}>
                  <SelectTrigger size="sm" className="w-32 shrink-0" aria-label={`Assignee for ${subtask.title}`}>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                aria-label={`Delete ${subtask.title}`}
                onClick={() => handleDelete(subtask)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Add a subtask..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={adding || !newTitle.trim()} onClick={handleAdd}>
          <Plus />
          Add
        </Button>
      </div>
    </div>
  );
}
