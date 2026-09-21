"use client";

import { useEffect, useState } from "react";
import { ExternalLink, IdCard, Link2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth/auth-provider";
import * as userService from "@/lib/services/user.service";
import { calculateProfileCompletion, domainLabel } from "@/types/candidate";
import type { UserRecord } from "@/types/user";

/**
 * Read-only by design: an intern's identity fields are set by an Admin at
 * invite time (see lib/server/invitations.ts) — the current onboarding
 * model has no self-edit step, matching the role-permissions table's
 * "CAN view own profile" / "CANNOT change User ID" split.
 */
export function MyProfileView() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<UserRecord | null | undefined>(undefined);

  useEffect(() => {
    if (!authUser) return;
    return userService.subscribeToUser(authUser.uid, setUser, () => setUser(null));
  }, [authUser]);

  return (
    <div>
      <PageHeader title="My Profile" description="Your account details and Candidate ID." />

      {user === undefined ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : !user ? (
        <EmptyState icon={IdCard} title="Profile unavailable" description="We couldn't load your profile right now." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="flex flex-col items-center gap-3 px-5 py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                {(user.name || user.email).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{user.name || "(No name)"}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              {user.userId && (
                <p className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  <IdCard className="size-3.5" /> {user.userId}
                </p>
              )}
              <p className="text-xs font-medium text-muted-foreground uppercase">{user.status}</p>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            {user.employmentType === "INTERN" && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile completion</CardTitle>
                  <CardDescription>Based on the fields your admin has filled in</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const completion = calculateProfileCompletion(user);
                    return (
                      <>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-foreground">{completion.percent}% complete</span>
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
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <Field label="College" value={user.collegeName} />
                <Field label="Branch" value={user.branch} />
                <Field label="Passed Out Year" value={user.passedOutYear ? String(user.passedOutYear) : undefined} />
                <Field label="Academic Year" value={user.academicYear} />
                <Field label="Domain" value={domainLabel(user.domain)} />
                <Field label="Secondary Domain" value={domainLabel(user.secondaryDomain)} />
                <Field label="Phone" value={user.phone} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {user.linkedinUrl && (
                  <a href={user.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
                    <Link2 className="size-4" /> LinkedIn <ExternalLink className="size-3" />
                  </a>
                )}
                {user.githubUrl && (
                  <a href={user.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
                    <Link2 className="size-4" /> GitHub <ExternalLink className="size-3" />
                  </a>
                )}
                {!user.linkedinUrl && !user.githubUrl && <p className="text-sm text-muted-foreground">No links on file.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value || "—"}</p>
    </div>
  );
}
