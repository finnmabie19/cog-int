import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { auth, signIn } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const devLoginEnabled = process.env.AUTH_DEV_LOGIN === "true";
const oidcEnabled = Boolean(process.env.OIDC_ISSUER);

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const users = devLoginEnabled
    ? await db.query.users.findMany({ orderBy: asc(schema.users.email) })
    : [];

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Internal Tools</CardTitle>
          <CardDescription>
            {devLoginEnabled
              ? "Development mode — sign in as a seeded user."
              : "Sign in with your organization account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {oidcEnabled && (
            <form
              action={async () => {
                "use server";
                await signIn("oidc", { redirectTo: "/" });
              }}
            >
              <Button type="submit" className="w-full">
                Sign in with SSO
              </Button>
            </form>
          )}
          {devLoginEnabled &&
            users.map((user) => (
              <form
                key={user.id}
                action={async () => {
                  "use server";
                  await signIn("dev-login", {
                    email: user.email,
                    redirectTo: "/",
                  });
                }}
              >
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-between"
                >
                  <span>
                    {user.name}
                    <span className="ml-2 text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </span>
                </Button>
              </form>
            ))}
          {!devLoginEnabled && !oidcEnabled && (
            <p className="text-sm text-destructive">
              No auth provider configured. Set AUTH_DEV_LOGIN=true locally or
              the OIDC_* variables in production.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
