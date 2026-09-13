"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { claimNewOrganization } from "@/lib/services/organization.service";
import { useAuth } from "@/components/auth/auth-provider";
import { ROLE_HOME_PATH } from "@/lib/platform/constants";

/**
 * Step 2 of registration — creates the account's organization via the
 * existing self-serve claim endpoint (app/api/organizations/self-serve),
 * the same real backend path CreateOrganizationDialog uses inside the admin
 * shell. The person completing this becomes that organization's admin
 * through that server-side logic alone — this screen never sets a role or
 * claim itself, it only calls the endpoint and waits for the refreshed
 * session to reflect what the server decided.
 */
export function CreateWorkspaceStep() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Workspace name must be at least 2 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await claimNewOrganization({ name: name.trim() });
      // The ID token cached in this session still carries the pre-workspace
      // (no-organization) claims — force a refresh so the new admin role/
      // organizationId take effect immediately, then route there directly.
      await refreshSession();
      router.replace(ROLE_HOME_PATH.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create your workspace. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Create your workspace</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">You&apos;ll be its administrator, with access scoped to it only.</p>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            placeholder="e.g. Acme Inc"
            autoComplete="organization"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? "true" : undefined}
          />
        </div>

        <Button type="submit" disabled={submitting} className="mt-1.5 w-full">
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "Creating workspace..." : "Create workspace"}
        </Button>
      </form>
    </div>
  );
}
