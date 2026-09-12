import type { Metadata } from "next";
import { ProjectDetailView } from "@/components/projects/project-detail-view";

export const metadata: Metadata = { title: "Project Details" };

export default async function ProjectDetailPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;

  return <ProjectDetailView projectId={id} />;
}
