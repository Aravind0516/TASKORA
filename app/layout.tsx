import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/auth-provider";
import { DemoRoleProvider } from "@/components/platform/demo-role-provider";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  // Only used in a couple of below-the-fold landing sections (scroll-story,
  // feature-showcase) — never needed on first paint, so don't eagerly
  // preload it on every page (that's what triggered the "preloaded but not
  // used within a few seconds" browser warning).
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "TASKORA — Intelligent Project Workflow & Team Collaboration",
    template: "%s · TASKORA",
  },
  description:
    "TASKORA is a premium project workflow and team collaboration platform for managing projects, tasks, and productivity insights.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <DemoRoleProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </DemoRoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
