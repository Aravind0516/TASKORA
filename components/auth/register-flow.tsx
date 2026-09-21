"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { RegisterChoiceStep } from "@/components/auth/register-choice-step";
import { RegisterForm } from "@/components/auth/register-form";
import { RegisterOrganizationStep } from "@/components/auth/register-organization-step";
import { RegistrationSubmittedStep } from "@/components/auth/registration-submitted-step";

type Step = "choice" | "account" | "organization" | "submitted";

const STEPS: { key: Step; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "organization", label: "Organization" },
  { key: "submitted", label: "Submitted" },
];

function StepIndicator({ step }: { step: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="mb-7 flex items-center justify-center gap-2" aria-hidden>
      {STEPS.map((s, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  isDone && "bg-primary text-primary-foreground",
                  isActive && "border-2 border-primary text-primary",
                  !isDone && !isActive && "border border-border text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn("text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Registration is choice-first, never organization-first — see the
 * "TASKORA REGISTRATION ARCHITECTURE CHANGE" request this replaced: the old
 * flow (account -> instantly claim a new organization, no choice) let ANY
 * new registrant become an org's admin purely by clicking through,
 * including candidates who only wanted to join an existing one. Now:
 *  0. Choice (RegisterChoiceStep) — "Join an existing organization" is a
 *     pure information panel (no account, no request, ever) pointing back
 *     to the real invitation flow; "Register a new organization" advances.
 *  1. Create the Firebase account (RegisterForm -> registerWithEmail). The
 *     server always grants role "user" / organizationId null here
 *     (firestore.rules' users/{uid} create rule), regardless of anything
 *     sent from the client — unchanged from before.
 *  2. Submit an organizationRegistrationRequests/{id} document
 *     (RegisterOrganizationStep) — NEVER an active organization and NEVER
 *     admin claims. Only a Super Admin approving it later
 *     (lib/server/organization-registrations.ts) ever creates the real
 *     organization and grants admin, to THIS account only.
 * Someone joining an EXISTING organization never sees any of this beyond
 * the choice screen — they go through the separate invitation-accept flow.
 */
export function RegisterFlow() {
  const [step, setStep] = useState<Step>("choice");

  if (step === "choice") {
    return <RegisterChoiceStep onRegisterOrganization={() => setStep("account")} />;
  }

  return (
    <div>
      <StepIndicator step={step} />
      {step === "account" && <RegisterForm onAccountCreated={() => setStep("organization")} />}
      {step === "organization" && <RegisterOrganizationStep onSubmitted={() => setStep("submitted")} />}
      {step === "submitted" && <RegistrationSubmittedStep />}
    </div>
  );
}
