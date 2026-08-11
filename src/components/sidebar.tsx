import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth";
import { canAccessTool } from "@/lib/registry";
import type { SessionUser } from "@/lib/session-user";
import { tools } from "@/tools";

/**
 * Generated from the tool registry, filtered by the current user's roles.
 * A tool never adds itself here — it appears automatically once registered
 * in src/tools/index.ts, and only for users allowed to open it.
 */
export function Sidebar({ user }: { user: SessionUser }) {
  const visibleTools = tools.filter((tool) => canAccessTool(user, tool));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/30 p-4">
      <Link href="/" className="mb-4 text-lg font-semibold">
        Internal Tools
      </Link>
      <nav className="flex flex-col gap-1">
        {visibleTools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            {tool.name}
          </Link>
        ))}
        {visibleTools.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            No tools available for your roles.
          </p>
        )}
      </nav>
      <div className="mt-auto">
        <Separator className="my-4" />
        <div className="mb-2 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
