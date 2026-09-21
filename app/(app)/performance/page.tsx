import type { Metadata } from "next";
import { MyPerformanceView } from "@/components/credits/my-performance-view";

export const metadata: Metadata = { title: "My Performance · TASKORA" };

export default function PerformancePage() {
  return <MyPerformanceView />;
}
