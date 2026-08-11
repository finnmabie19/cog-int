import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canAccessTool } from "@/lib/registry";
import { getTool } from "@/tools";

/**
 * The single route for every tool. A tool that the user's roles don't cover
 * is indistinguishable from one that doesn't exist.
 */
export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const tool = getTool(slug);
  if (!tool || !canAccessTool(user, tool)) notFound();

  const Page = tool.page;
  return <Page />;
}
