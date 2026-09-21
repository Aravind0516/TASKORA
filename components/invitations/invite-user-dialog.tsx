"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Copy, Loader2, Mail, MailWarning, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUserSchema, REQUIRED_INTERN_FIELDS, type InviteUserFormValues } from "@/lib/validation/invitation.schema";
import { createInvitation, resendInvitation, checkUserIdAvailable } from "@/lib/services/invitation.service";
import { DOMAIN_OPTIONS } from "@/types/candidate";
import type { PlatformTeam, PlatformProject } from "@/types/platform";
import { FUNCTIONAL_ROLES } from "@/types/user";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  teams: PlatformTeam[];
  projects: PlatformProject[];
}

// Sentinel item value for "no team assigned" — Select items can't use an
// empty string as their value, so this is translated to/from null at the
// API boundary in onSubmit below.
const NO_TEAM = "none";
// Same pattern for "no functional role chosen yet" and "no domain chosen yet."
const NO_FUNCTIONAL_ROLE = "none";
const NO_DOMAIN = "none";

const defaultValues: InviteUserFormValues = {
  name: "",
  email: "",
  teamId: NO_TEAM,
  projectIds: [],
  functionalRole: undefined,
  employmentType: "EMPLOYEE",
  userId: "",
  collegeName: "",
  branch: "",
  passedOutYear: "",
  academicYear: "",
  domain: "",
  secondaryDomain: "",
  linkedinUrl: "",
  githubUrl: "",
  phone: "",
  role: "user",
};

interface InviteResult {
  recipientEmail: string;
  invitationId: string;
  invitationUrl: string;
  emailSent: boolean;
}

type UserIdCheck = "idle" | "checking" | "available" | "taken" | "invalid";

export function InviteUserDialog({ open, onOpenChange, organizationId, teams, projects }: InviteUserDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);
  const [userIdCheck, setUserIdCheck] = useState<UserIdCheck>("idle");
  const [projectSearch, setProjectSearch] = useState("");

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues,
  });

  const employmentType = useWatch({ control, name: "employmentType" });
  const userIdValue = useWatch({ control, name: "userId" });
  const isIntern = employmentType === "INTERN";

  useEffect(() => {
    const value = (userIdValue ?? "").trim();
    let cancelled = false;

    // Every setState below is deferred (microtask or the debounce timer
    // itself) rather than called synchronously in the effect body — same
    // pattern this codebase already uses (see AuthProvider) to satisfy
    // react-hooks/set-state-in-effect while still reacting to a value that
    // changed on every keystroke.
    if (!value) {
      Promise.resolve().then(() => !cancelled && setUserIdCheck("idle"));
      return () => {
        cancelled = true;
      };
    }
    if (value.length < 3) {
      Promise.resolve().then(() => !cancelled && setUserIdCheck("invalid"));
      return () => {
        cancelled = true;
      };
    }

    Promise.resolve().then(() => !cancelled && setUserIdCheck("checking"));
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const { available } = await checkUserIdAvailable(value);
        if (!cancelled) setUserIdCheck(available ? "available" : "taken");
      } catch {
        if (!cancelled) setUserIdCheck("idle");
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userIdValue]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(defaultValues);
      setFormError(null);
      setResult(null);
      setCopied(false);
      setSendEmailError(null);
      setUserIdCheck("idle");
      setProjectSearch("");
    }
    onOpenChange(next);
  }

  async function onSubmit(values: InviteUserFormValues) {
    setFormError(null);

    if (values.employmentType === "INTERN") {
      let hasMissing = false;
      for (const [field, message] of REQUIRED_INTERN_FIELDS) {
        const value = values[field];
        if (value === undefined || value === "" || value === null) {
          setError(field, { message });
          hasMissing = true;
        }
      }
      if (hasMissing) return;
    }

    if (isIntern && userIdCheck === "taken") {
      setError("userId", { message: "This User ID is already in use." });
      return;
    }

    try {
      const { invitation, invitationUrl, emailSent } = await createInvitation({
        organizationId,
        name: values.name,
        email: values.email,
        role: values.role,
        teamId: values.teamId && values.teamId !== NO_TEAM ? values.teamId : null,
        projectIds: values.projectIds,
        functionalRole: values.functionalRole ?? null,
        employmentType: values.employmentType,
        userId: values.userId ? values.userId : null,
        collegeName: values.collegeName || null,
        branch: values.branch || null,
        passedOutYear: values.passedOutYear ? Number(values.passedOutYear) : null,
        academicYear: values.academicYear || null,
        domain: values.domain && values.domain !== NO_DOMAIN ? values.domain : null,
        secondaryDomain: values.secondaryDomain && values.secondaryDomain !== NO_DOMAIN ? values.secondaryDomain : null,
        linkedinUrl: values.linkedinUrl || null,
        githubUrl: values.githubUrl || null,
        phone: values.phone || null,
      });

      // Stay open and show the result — the invitation link can only ever be
      // shown here (the raw token isn't recoverable later, only its hash is
      // stored), so this is the one moment to offer Copy Link / Send Email.
      setResult({ recipientEmail: invitation.email, invitationId: invitation.id, invitationUrl, emailSent });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong creating the invitation. Please try again.";
      if (message.toLowerCase().includes("pending invitation")) {
        setError("email", { message });
      } else if (message.toLowerCase().includes("user id")) {
        setError("userId", { message });
      } else {
        setFormError(message);
      }
    }
  }

  async function handleCopyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setSendEmailError("Couldn't copy automatically — select and copy the link manually.");
    }
  }

  async function handleSendEmail() {
    if (!result) return;
    setSendingEmail(true);
    setSendEmailError(null);
    try {
      const { emailSent, emailError } = await resendInvitation(result.invitationId);
      setResult({ ...result, emailSent });
      if (!emailSent) setSendEmailError(emailError ?? "Invitation could not be sent. Please try again.");
    } catch (error) {
      setSendEmailError(error instanceof Error ? error.message : "Invitation could not be sent. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  }

  function toggleProject(selected: string[], projectId: string, checked: boolean, onChange: (next: string[]) => void) {
    onChange(checked ? [...selected, projectId] : selected.filter((id) => id !== projectId));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success" />
                Invitation created successfully
              </DialogTitle>
              <DialogDescription>{result.recipientEmail}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {result.emailSent ? (
                <div className="flex items-start gap-2 rounded-lg bg-success/10 px-3.5 py-2.5 text-sm text-success">
                  <Mail className="mt-0.5 size-4 shrink-0" />
                  <span>Invitation email sent successfully.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                  <MailWarning className="mt-0.5 size-4 shrink-0" />
                  <span>Invitation created. Email delivery is unavailable.</span>
                </div>
              )}

              {sendEmailError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{sendEmailError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="invite-link">Invitation link</Label>
                <Input id="invite-link" readOnly value={result.invitationUrl} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="flex-1" onClick={handleCopyLink}>
                  <Copy />
                  {copied ? "Invitation link copied." : "Copy Invitation Link"}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={handleSendEmail} disabled={sendingEmail}>
                  <Mail />
                  {sendingEmail ? "Sending..." : result.emailSent ? "Resend Email" : "Send Email"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>Invite a new member to your organization.</DialogDescription>
            </DialogHeader>

            <form id="invite-user-form" onSubmit={handleSubmit(onSubmit)} className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input id="invite-name" placeholder="e.g. Jordan Lee" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input id="invite-email" type="email" placeholder="jordan@company.com" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-employment-type">Employment type</Label>
                  <Controller
                    control={control}
                    name="employmentType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "EMPLOYEE")}>
                        <SelectTrigger id="invite-employment-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                          <SelectItem value="INTERN">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Role</Label>
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={() => field.onChange("user")}>
                        <SelectTrigger id="invite-role" className="w-full">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">Admin invites will be added in a future update.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-user-id">User ID / Candidate ID {isIntern && <span className="text-destructive">*</span>}</Label>
                <div className="relative">
                  <Input id="invite-user-id" placeholder="NXT26-IT-0001" {...register("userId")} className="pr-9" />
                  <span className="absolute inset-y-0 right-2.5 flex items-center">
                    {userIdCheck === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {userIdCheck === "available" && <CheckCircle2 className="size-4 text-success" />}
                    {userIdCheck === "taken" && <X className="size-4 text-destructive" />}
                  </span>
                </div>
                {userIdCheck === "available" && <p className="text-xs text-success">✓ Available</p>}
                {userIdCheck === "taken" && <p className="text-xs text-destructive">✗ User ID already exists</p>}
                {errors.userId && <p className="text-xs text-destructive">{errors.userId.message}</p>}
                {!isIntern && <p className="text-xs text-muted-foreground">Optional for employees — required for interns.</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-team">Team</Label>
                  {teams.length > 0 ? (
                    <Controller
                      control={control}
                      name="teamId"
                      render={({ field }) => (
                        <Select value={field.value || NO_TEAM} onValueChange={(value) => field.onChange(value ?? NO_TEAM)}>
                          <SelectTrigger id="invite-team" className="w-full">
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_TEAM}>No team assigned</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <div className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                      <p>No teams available.</p>
                      <Link href="/admin/teams" className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
                        Create a team first →
                      </Link>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-functional-role">Functional role</Label>
                  <Controller
                    control={control}
                    name="functionalRole"
                    render={({ field }) => (
                      <Select
                        value={field.value || NO_FUNCTIONAL_ROLE}
                        onValueChange={(value) => field.onChange(value === NO_FUNCTIONAL_ROLE ? undefined : value)}
                      >
                        <SelectTrigger id="invite-functional-role" className="w-full">
                          <SelectValue placeholder="Select a functional role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_FUNCTIONAL_ROLE}>Not set</SelectItem>
                          {FUNCTIONAL_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Project(s)</Label>
                {projects.length === 0 ? (
                  <p className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                    No projects created yet — you can assign one later.
                  </p>
                ) : (
                  <Controller
                    control={control}
                    name="projectIds"
                    render={({ field }) => {
                      const filteredProjects = projectSearch.trim()
                        ? projects.filter((p) => p.name.toLowerCase().includes(projectSearch.trim().toLowerCase()))
                        : projects;
                      return (
                        <>
                          {projects.length > 5 && (
                            <Input
                              placeholder="Search projects..."
                              value={projectSearch}
                              onChange={(e) => setProjectSearch(e.target.value)}
                              className="mb-1.5"
                            />
                          )}
                          <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border border-border p-2.5">
                            {filteredProjects.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No projects match your search.</p>
                            ) : (
                              filteredProjects.map((project) => (
                                <label key={project.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={field.value.includes(project.id)}
                                    onCheckedChange={(checked) => toggleProject(field.value, project.id, Boolean(checked), field.onChange)}
                                  />
                                  <span className="truncate">{project.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Selected: {field.value.length} project{field.value.length === 1 ? "" : "s"}
                          </p>
                        </>
                      );
                    }}
                  />
                )}
              </div>

              {isIntern && (
                <div className="space-y-4 rounded-lg border border-dashed border-border p-3.5">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Intern details</p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-college">College</Label>
                      <Input id="invite-college" {...register("collegeName")} />
                      {errors.collegeName && <p className="text-xs text-destructive">{errors.collegeName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-branch">Branch</Label>
                      <Input id="invite-branch" {...register("branch")} />
                      {errors.branch && <p className="text-xs text-destructive">{errors.branch.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-passed-out-year">Passed out year</Label>
                      <Input id="invite-passed-out-year" type="number" placeholder="2026" {...register("passedOutYear")} />
                      {errors.passedOutYear && <p className="text-xs text-destructive">{errors.passedOutYear.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-academic-year">Academic year</Label>
                      <Input id="invite-academic-year" placeholder="Final Year" {...register("academicYear")} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-domain">Domain</Label>
                      <Controller
                        control={control}
                        name="domain"
                        render={({ field }) => (
                          <Select value={field.value || NO_DOMAIN} onValueChange={(v) => field.onChange(v === NO_DOMAIN ? "" : v)}>
                            <SelectTrigger id="invite-domain" className="w-full">
                              <SelectValue placeholder="Select a domain" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_DOMAIN}>Select a domain</SelectItem>
                              {DOMAIN_OPTIONS.map((d) => (
                                <SelectItem key={d.value} value={d.value}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.domain && <p className="text-xs text-destructive">{errors.domain.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-secondary-domain">Secondary domain</Label>
                      <Controller
                        control={control}
                        name="secondaryDomain"
                        render={({ field }) => (
                          <Select value={field.value || NO_DOMAIN} onValueChange={(v) => field.onChange(v === NO_DOMAIN ? "" : v)}>
                            <SelectTrigger id="invite-secondary-domain" className="w-full">
                              <SelectValue placeholder="Optional" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_DOMAIN}>Not set</SelectItem>
                              {DOMAIN_OPTIONS.map((d) => (
                                <SelectItem key={d.value} value={d.value}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-linkedin">LinkedIn</Label>
                      <Input id="invite-linkedin" placeholder="https://linkedin.com/in/..." {...register("linkedinUrl")} />
                      {errors.linkedinUrl && <p className="text-xs text-destructive">{errors.linkedinUrl.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="invite-github">GitHub</Label>
                      <Input id="invite-github" placeholder="https://github.com/..." {...register("githubUrl")} />
                      {errors.githubUrl && <p className="text-xs text-destructive">{errors.githubUrl.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="invite-phone">Phone (optional)</Label>
                    <Input id="invite-phone" {...register("phone")} />
                  </div>
                </div>
              )}
            </form>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form="invite-user-form" disabled={isSubmitting || (isIntern && userIdCheck === "checking")}>
                {isSubmitting ? "Creating..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
