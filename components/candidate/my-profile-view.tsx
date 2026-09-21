"use client";

import { useEffect, useState } from "react";
import { ExternalLink, IdCard, Link2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import * as userService from "@/lib/services/user.service";
import * as organizationService from "@/lib/services/organization.service";
import { calculateProfileCompletion, domainLabel } from "@/types/candidate";
import { EditProfileDialog } from "@/components/candidate/edit-profile-dialog";
import { ROLE_DISPLAY_LABELS } from "@/lib/platform/constants";
import type { UserRecord } from "@/types/user";
import type { OrganizationDoc } from "@/types/organization";

/**
 * Available to every role (Admin/Super Admin included — see app/(app)/
 * layout.tsx's ProtectedRoute, which gates on "signed in," not role). Fields
 * are split into what the account itself can change (Personal, Academic,
 * Links — see EditProfileDialog, whose allow-list mirrors firestore.rules'
 * users/{uid} self-edit branch exactly) and what only an Admin/Super Admin
 * controls (Account Information: Candidate ID, Role, Organization, Team,
 * Status) — those are rendered read-only here by construction, not merely
 * hidden behind a missing button.
 */
export function MyProfileView() {
  const { user: authUser, role } = useAuth();
  const { organizationId, teams } = useWorkspace();
  const [user, setUser] = useState<UserRecord | null | undefined>(undefined);
  const [organization, setOrganization] = useState<OrganizationDoc | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    return userService.subscribeToUser(authUser.uid, setUser, () => setUser(null));
  }, [authUser]);

  useEffect(() => {
    if (!organizationId) {
      // Deferred, not synchronous — matches this codebase's established
      // react-hooks/set-state-in-effect pattern (see invite-user-dialog.tsx).
      let cancelled = false;
      Promise.resolve().then(() => !cancelled && setOrganization(null));
      return () => {
        cancelled = true;
      };
    }
    return organizationService.subscribeToOrganization(organizationId, setOrganization, () => setOrganization(null));
  }, [organizationId]);

  // teams is always the signed-in account's own organization's roster
  // (empty for Super Admin, whose organizationId is always null) — filtering
  // by the user's own teamIds here never performs a cross-org read.
  const myTeamNames = user ? teams.filter((t) => user.teamIds.includes(t.id)).map((t) => t.name) : [];

  return (
    <div>
      <PageHeader title="My Profile" description="Your account details, academic background, and professional links." />

      {user === undefined ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : !user ? (
        <EmptyState icon={IdCard} title="Profile unavailable" description="We couldn't load your profile right now." />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 px-5 py-7 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                  {(user.name || user.email).slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{user.name || "(No name)"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    {user.userId && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                        <IdCard className="size-3.5" /> {user.userId}
                      </span>
                    )}
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{user.status}</span>
                  </div>
                </div>
              </div>
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {user.employmentType === "INTERN" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile completion</CardTitle>
                <CardDescription>Based on the fields filled in so far</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const completion = calculateProfileCompletion(user);
                  return (
                    <>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-foreground">{completion.percent}% complete</span>
                        {completion.missingSections.length > 0 && (
                          <span className="text-xs text-muted-foreground">Missing: {completion.missingSections.join(", ")}</span>
                        )}
                      </div>
                      <Progress value={completion.percent} className="h-2" />
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Field label="Full Name" value={user.name} />
              <Field label="Email" value={user.email} hint="Read-only — managed by Firebase Authentication" />
              <Field label="Phone" value={user.phone} />
              <Field label="Address" value={user.address} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic / Professional</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Field label="College Name" value={user.collegeName} />
              <Field label="Branch" value={user.branch} />
              <Field label="Passed Out Year" value={user.passedOutYear ? String(user.passedOutYear) : undefined} />
              <Field label="Domain" value={domainLabel(user.domain)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {[
                { label: "LinkedIn", url: user.linkedinUrl },
                { label: "GitHub", url: user.githubUrl },
                { label: "Portfolio", url: user.portfolioUrl },
              ]
                .filter((link) => link.url)
                .map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                  >
                    <Link2 className="size-4" /> {link.label} <ExternalLink className="size-3" />
                  </a>
                ))}
              {!user.linkedinUrl && !user.githubUrl && !user.portfolioUrl && (
                <p className="text-sm text-muted-foreground">No links on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Controlled by your organization — not editable from this page</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Field label="Candidate ID" value={user.userId} />
              <Field label="Role" value={role ? ROLE_DISPLAY_LABELS[role] : undefined} />
              <Field label="Organization" value={organization?.name} />
              <Field label="Team" value={myTeamNames.length ? myTeamNames.join(", ") : undefined} />
              <Field label="Account Status" value={user.status} />
            </CardContent>
          </Card>
        </div>
      )}

      {user && (
        <EditProfileDialog
          key={user.updatedAt}
          open={editOpen}
          onOpenChange={setEditOpen}
          user={user}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value?: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value || "—"}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
