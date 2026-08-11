import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { canAccessTool } from "@/lib/registry";
import { tools } from "@/tools";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const user = await requireUser();
  const visibleTools = tools.filter((tool) => canAccessTool(user, tool));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="mb-6 text-muted-foreground">
        Tools available to your roles ({user.roles.join(", ") || "none"}):
      </p>
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {visibleTools.map((tool) => (
          <Link key={tool.slug} href={`/tools/${tool.slug}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle>{tool.name}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
