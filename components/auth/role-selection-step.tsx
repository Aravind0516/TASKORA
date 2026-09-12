import { RoleSelectCards } from "@/components/auth/role-select-cards";
import type { PlatformRole } from "@/types/platform";

export function RoleSelectionStep({ onSelect }: { onSelect: (role: PlatformRole) => void }) {
  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Welcome back to TASKORA</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Choose how you want to sign in</p>
      </div>
      <RoleSelectCards onSelect={onSelect} />
    </div>
  );
}
