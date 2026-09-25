"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { TeamMember } from "@/types/team";
import type { DeliverableStatus } from "@/types/deliverable";
import { selectItems } from "@/lib/select-items";

const NO_ASSIGNEE = "none";

const deliverableSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(120),
  description: z.string().trim().optional(),
  status: z.enum(["Pending", "Ready", "Delivered"]),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});
type DeliverableFormValues = z.infer<typeof deliverableSchema>;

export interface DeliverableFormSubmitValues {
  title: string;
  description: string;
  status: DeliverableStatus;
  dueDate: string | null;
  assignedTo: string | null;
}

interface DeliverableFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMember[];
  onSubmit: (values: DeliverableFormSubmitValues) => Promise<void>;
}

export function DeliverableFormDialog({ open, onOpenChange, members, onSubmit }: DeliverableFormDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeliverableFormValues>({
    resolver: zodResolver(deliverableSchema),
    defaultValues: { title: "", description: "", status: "Pending", dueDate: "", assignedTo: NO_ASSIGNEE },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset({ title: "", description: "", status: "Pending", dueDate: "", assignedTo: NO_ASSIGNEE });
      setFormError(null);
    }
    onOpenChange(next);
  }

  async function submit(values: DeliverableFormValues) {
    setFormError(null);
    try {
      await onSubmit({
        title: values.title,
        description: values.description ?? "",
        status: values.status,
        dueDate: values.dueDate ? values.dueDate : null,
        assignedTo: values.assignedTo && values.assignedTo !== NO_ASSIGNEE ? values.assignedTo : null,
      });
      handleOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save the deliverable.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Deliverable</DialogTitle>
          <DialogDescription>Track an artifact this project needs to produce.</DialogDescription>
        </DialogHeader>

        <form id="deliverable-form" onSubmit={handleSubmit(submit)} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-title">Title</Label>
            <Input id="deliverable-title" placeholder="e.g. Accessibility Audit Report" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-description">Description (optional)</Label>
            <Textarea id="deliverable-description" rows={3} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange((v ?? "Pending") as DeliverableStatus)}>
                    <SelectTrigger id="deliverable-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Ready">Ready</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-due">Due date (optional)</Label>
              <Input id="deliverable-due" type="date" {...register("dueDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deliverable-assignee">Responsible (optional)</Label>
            <Controller
              control={control}
              name="assignedTo"
              render={({ field }) => (
                <Select
                  value={field.value || NO_ASSIGNEE}
                  onValueChange={(v) => field.onChange(v ?? NO_ASSIGNEE)}
                  items={selectItems(members, (m) => m.id, (m) => m.name, { extra: { [NO_ASSIGNEE]: "Unassigned" }, value: field.value, unresolvedLabel: "Unknown user" })}
                >
                  <SelectTrigger id="deliverable-assignee" className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="deliverable-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add Deliverable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
