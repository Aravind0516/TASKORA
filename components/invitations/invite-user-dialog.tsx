"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Copy, Mail, MailWarning } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUserSchema, type InviteUserFormValues } from "@/lib/validation/invitation.schema";
import { createInvitation, resendInvitation } from "@/lib/services/invitation.service";
import type { PlatformTeam } from "@/types/platform";
import { FUNCTIONAL_ROLES } from "@/types/user";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  teams: PlatformTeam[];
}

// Sentinel item value for "no team assigned" — Select items can't use an
// empty string as their value, so this is translated to/from null at the
// API boundary in onSubmit below.
const NO_TEAM = "none";
// Same pattern for "no functional role chosen yet."
const NO_FUNCTIONAL_ROLE = "none";

const defaultValues: InviteUserFormValues = { name: "", email: "", teamId: NO_TEAM, functionalRole: undefined, role: "user" };

interface InviteResult {
  recipientEmail: string;
  invitationId: string;
  invitationUrl: string;
  emailSent: boolean;
}

export function InviteUserDialog({ open, onOpenChange, organizationId, teams }: InviteUserDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);

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

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(defaultValues);
      setFormError(null);
      setResult(null);
      setCopied(false);
      setSendEmailError(null);
    }
    onOpenChange(next);
  }

  async function onSubmit(values: InviteUserFormValues) {
    setFormError(null);

    try {
      const { invitation, invitationUrl, emailSent } = await createInvitation({
        organizationId,
        name: values.name,
        email: values.email,
        role: values.role,
        teamId: values.teamId && values.teamId !== NO_TEAM ? values.teamId : null,
        // functionalRole never actually holds the NO_FUNCTIONAL_ROLE sentinel here —
        // the Select's onValueChange already converts it back to undefined.
        functionalRole: values.functionalRole ?? null,
      });

      // Stay open and show the result — the invitation link can only ever be
      // shown here (the raw token isn't recoverable later, only its hash is
      // stored), so this is the one moment to offer Copy Link / Send Email.
      setResult({ recipientEmail: invitation.email, invitationId: invitation.id, invitationUrl, emailSent });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong creating the invitation. Please try again.";
      if (message.toLowerCase().includes("pending invitation")) {
        setError("email", { message });
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[#0ca30c]" />
                Invitation created successfully
              </DialogTitle>
              <DialogDescription>{result.recipientEmail}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {result.emailSent ? (
                <div className="flex items-start gap-2 rounded-lg bg-[#0ca30c]/10 px-3.5 py-2.5 text-sm text-[#0ca30c]">
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

            <form id="invite-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

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
                    <p className="rounded-lg bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                      No teams created yet — you can assign a team later.
                    </p>
                  )}
                  {errors.teamId && <p className="text-xs text-destructive">{errors.teamId.message}</p>}
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
                <p className="text-xs text-muted-foreground">What this person does on their team/projects — not an access level.</p>
              </div>
            </form>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form="invite-user-form" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
