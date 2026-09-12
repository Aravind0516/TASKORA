import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectDirectory } from "@/components/projects/project-directory";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader title="Projects" description="Projects across your workspace" />
      <ProjectDirectory />
    </div>
  );
}
