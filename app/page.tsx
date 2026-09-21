import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { RootPageGate } from "@/components/auth/root-page-gate";

export const metadata: Metadata = {
  title: { absolute: "TASKORA — Modern Work Management Platform" },
  description:
    "TASKORA unifies projects, tasks, and teams into one intelligent workspace — turning scattered work into momentum. Plan less, execute better, move faster.",
  openGraph: {
    title: "TASKORA — Modern Work Management Platform",
    description:
      "TASKORA unifies projects, tasks, and teams into one intelligent workspace — turning scattered work into momentum.",
    type: "website",
    siteName: "TASKORA",
  },
  twitter: {
    card: "summary_large_image",
    title: "TASKORA — Modern Work Management Platform",
    description:
      "TASKORA unifies projects, tasks, and teams into one intelligent workspace — turning scattered work into momentum.",
  },
};

export default function RootPage() {
  return (
    <RootPageGate>
      <LandingPage />
    </RootPageGate>
  );
}
