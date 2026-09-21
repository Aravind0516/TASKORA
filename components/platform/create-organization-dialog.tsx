"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitOrganizationRegistration } from "@/lib/services/organization-registration.service";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Submits an organizationRegistrationRequests/{id} document for Super Admin
 * review — never an active organization, never admin access. This used to
 * call the instant self-serve claim endpoint (organizations/self-serve);
 * see lib/server/organization-registrations.ts for why that changed. The
 * caller only ever becomes that organization's admin once a Super Admin
 * approves the request (Super Admin -> Organization Requests).
 */
export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName("");
      setDescription("");
      setError(null);
      setSubmitted(false);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Organization name must be at least 2 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitOrganizationRegistration({ organizationName: name.trim(), description: description.trim() || undefined });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit your organization registration.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success" />
                Registration submitted
              </DialogTitle>
              <DialogDescription>
                Your organization registration is now awaiting Super Admin approval. You&apos;ll be notified once it&apos;s reviewed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Register your organization</DialogTitle>
              <DialogDescription>You&apos;ll become its administrator once a Super Admin approves this request.</DialogDescription>
            </DialogHeader>

            <div className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info/10 px-3.5 py-2.5 text-sm text-info">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>New organization registrations require Super Admin approval before the workspace becomes active.</span>
            </div>

            <form id="create-org-form" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="org-name">Organization name</Label>
                <Input id="org-name" placeholder="e.g. Acme Inc" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org-description">Description (optional)</Label>
                <Textarea
                  id="org-description"
                  rows={3}
                  placeholder="What does your organization do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </form>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form="create-org-form" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Registration Request"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
