import type { Metadata } from "next";
import { MyCreditsView } from "@/components/credits/my-credits-view";

export const metadata: Metadata = { title: "My Credits · TASKORA" };

export default function CreditsPage() {
  return <MyCreditsView />;
}
