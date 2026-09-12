"use client";

import { useState } from "react";
import { RoleSelectionStep } from "@/components/auth/role-selection-step";
import { LoginForm } from "@/components/auth/login-form";
import type { PlatformRole } from "@/types/platform";

interface LoginFlowProps {
  /** Overrides the "Forgot password?" link — used when embedded in a dialog. */
  onForgotPasswordClick?: () => void;
  /** Overrides the "Register" link — used when embedded in a dialog. */
  onRegisterClick?: () => void;
  /** Lets an embedding dialog resize itself between the wide role-selection step and the narrow credentials step. */
  onStepChange?: (step: "select" | "form") => void;
}

export function LoginFlow({ onForgotPasswordClick, onRegisterClick, onStepChange }: LoginFlowProps) {
  const [selectedRole, setSelectedRole] = useState<PlatformRole | null>(null);

  function selectRole(role: PlatformRole) {
    setSelectedRole(role);
    onStepChange?.("form");
  }

  function changeRole() {
    setSelectedRole(null);
    onStepChange?.("select");
  }

  if (!selectedRole) {
    return <RoleSelectionStep onSelect={selectRole} />;
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <LoginForm
        expectedRole={selectedRole}
        onChangeRole={changeRole}
        onForgotPasswordClick={onForgotPasswordClick}
        onRegisterClick={onRegisterClick}
      />
    </div>
  );
}
