"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, IdCard, Info, Mail, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Choice = "join" | "register" | null;

interface RegisterChoiceStepProps {
  onRegisterOrganization: () => void;
}

/**
 * The one place this app deliberately asks "which of these two are you"
 * before showing any account-creation form — the whole point of this
 * screen is to make organization creation something a person opts INTO,
 * never something they stumble into by clicking "Create Account." Choosing
 * "Join" never creates anything (no Firebase account, no request) — it's
 * purely informational, pointing back to the existing invitation flow.
 */
export function RegisterChoiceStep({ onRegisterOrganization }: RegisterChoiceStepProps) {
  const [choice, setChoice] = useState<Choice>(null);

  if (choice === "join") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Joining an existing organization?</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">You don&apos;t need to create an account here.</p>
        </div>
        <div className="space-y-3 rounded-lg border border-border bg-surface-muted px-4 py-4 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
            Ask your organization administrator to send you an invitation — they&apos;ll do this from their Users page.
          </p>
          <p className="flex items-start gap-2">
            <IdCard className="mt-0.5 size-4 shrink-0 text-primary" />
            If you&apos;re a candidate or intern, your admin will assign you a Candidate ID as part of that invitation.
          </p>
          <p>
            Once you receive the invitation link by email, open it to set your password and log in — your dashboard, team, and
            project assignments will already be waiting for you.
          </p>
        </div>
        <Button className="mt-6 w-full" nativeButton={false} render={<Link href="/login" />}>
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">How are you joining TASKORA?</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Choose the option that matches you — it only takes a second.</p>
      </div>

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          If you&apos;re a candidate, intern, employee or individual joining an existing organization, please don&apos;t create a new
          one — ask your organization administrator to invite you. New organization registrations are subject to Super Admin approval.
        </p>
      </div>

      <div className="space-y-3">
        <Card
          className="cursor-pointer transition-colors hover:border-primary/40"
          onClick={() => setChoice("join")}
        >
          <CardContent className="flex items-start gap-3.5 px-4 py-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Join an existing organization</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                For candidates, interns and employees who received or need an organization invitation.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-primary/40"
          onClick={onRegisterOrganization}
        >
          <CardContent className="flex items-start gap-3.5 px-4 py-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Register a new organization</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                For organization owners/admins who want to create a new TASKORA workspace.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
