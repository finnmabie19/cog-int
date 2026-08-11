import type { ToolDefinition } from "@/lib/registry";
import { notesTool } from "./notes";

/**
 * Every tool on the platform. Adding a tool = adding one entry here.
 * The sidebar, the /tools/[slug] route, and access control all read from
 * this list.
 */
export const tools: ToolDefinition[] = [notesTool];

export function getTool(slug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug === slug);
}
