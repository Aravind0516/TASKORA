"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { RegisterForm } from "@/components/auth/register-form";
import { CreateWorkspaceStep } from "@/components/auth/create-workspace-step";

type Step = "account" | "workspace";

const STEPS: { key: Step; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "workspace", label: "Workspace" },
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
 * Registration is two real, sequential steps against two existing backend
 * endpoints — never a single combined form and never a role picker:
 *  1. Create the Firebase account (RegisterForm -> registerWithEmail).
 *     The server always grants role "user" / organizationId null here
 *     (firestore.rules' users/{uid} create rule), regardless of anything
 *     sent from the client.
 *  2. Claim a new organization (CreateWorkspaceStep -> the self-serve API),
 *     which is the ONLY thing that grants admin — server-side, via
 *     lib/server/organizations.ts, never a client-set field.
 * Someone joining an EXISTING organization never sees this page at all —
 * they go through the separate invitation-accept flow instead.
 */
export function RegisterFlow() {
  const [step, setStep] = useState<Step>("account");

  return (
    <div>
      <StepIndicator step={step} />
      {step === "account" ? (
        <RegisterForm onAccountCreated={() => setStep("workspace")} />
      ) : (
        <CreateWorkspaceStep />
      )}
    </div>
  );
}
