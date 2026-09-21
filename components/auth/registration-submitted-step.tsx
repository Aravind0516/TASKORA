import Link from "next/link";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown immediately after submitting a "Register a new organization" request — see components/auth/organization-registration-gate.tsx for the equivalent state shown on any LATER login before approval. */
export function RegistrationSubmittedStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-info/10 text-info">
        <Clock3 className="size-5" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">Registration submitted</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Thanks — your organization registration is now awaiting Super Admin approval. We&apos;ll notify you as soon as it&apos;s reviewed.
      </p>
      <Button className="mt-6 w-full" nativeButton={false} render={<Link href="/login" />}>
        Back to Login
      </Button>
    </div>
  );
}
