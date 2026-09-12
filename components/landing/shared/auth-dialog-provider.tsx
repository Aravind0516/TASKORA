"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AuthDialog, type AuthDialogView } from "@/components/landing/auth-dialog";

interface AuthDialogContextValue {
  openAuth: (view: AuthDialogView) => void;
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AuthDialogView>("login");

  const openAuth = useCallback((nextView: AuthDialogView) => {
    setView(nextView);
    setOpen(true);
  }, []);

  return (
    <AuthDialogContext.Provider value={{ openAuth }}>
      {children}
      <AuthDialog open={open} onOpenChange={setOpen} view={view} onViewChange={setView} />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog(): AuthDialogContextValue {
  const ctx = useContext(AuthDialogContext);
  if (!ctx) throw new Error("useAuthDialog must be used within AuthDialogProvider");
  return ctx;
}
