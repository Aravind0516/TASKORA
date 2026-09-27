import type { Metadata } from "next";
import { ProjectDetailView } from "@/components/projects/project-detail-view";

export const metadata: Metadata = { title: "Admin · Project Details" };

// The shared project detail page, inside the admin console so opening a
// project never moves an admin into the member workspace — see lib/shell-routes.ts.
export default async function AdminProjectDetailPage(props: PageProps<"/admin/projects/[id]">) {
  const { id } = await props.params;
  return <ProjectDetailView projectId={id} />;
}
