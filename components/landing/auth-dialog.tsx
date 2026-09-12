"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoginFlow } from "@/components/auth/login-flow";
import { RegisterForm } from "@/components/auth/register-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export type AuthDialogView = "login" | "register";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: AuthDialogView;
  onViewChange: (view: AuthDialogView) => void;
}

const VIEW_TITLES: Record<AuthDialogView | "forgot", string> = {
  login: "Log in to TASKORA",
  register: "Create your TASKORA account",
  forgot: "Reset your password",
};

export function AuthDialog({ open, onOpenChange, view, onViewChange }: AuthDialogProps) {
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<"select" | "form">("select");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setForgotOpen(false);
      setLoginStep("select");
    }
    onOpenChange(next);
  }

  const effectiveView: AuthDialogView | "forgot" = forgotOpen ? "forgot" : view;
  // The role-selection step needs room for three cards side by side; every
  // other view (credentials, register, forgot password) is a single-column
  // form and keeps the original narrow width.
  const isWide = effectiveView === "login" && loginStep === "select";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          isWide
            ? "dark w-full max-w-2xl border-none bg-transparent p-0 shadow-none ring-0 transition-[max-width] duration-200"
            : "dark w-full max-w-sm border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-sm transition-[max-width] duration-200"
        }
        showCloseButton
      >
        <DialogTitle className="sr-only">{VIEW_TITLES[effectiveView]}</DialogTitle>
        <DialogDescription className="sr-only">TASKORA account authentication</DialogDescription>

        {effectiveView === "login" && (
          <LoginFlow
            onForgotPasswordClick={() => setForgotOpen(true)}
            onRegisterClick={() => onViewChange("register")}
            onStepChange={setLoginStep}
          />
        )}
        {effectiveView === "register" && <RegisterForm onLoginClick={() => onViewChange("login")} />}
        {effectiveView === "forgot" && <ForgotPasswordForm onBackToLoginClick={() => setForgotOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
