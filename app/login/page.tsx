import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-mock";

// TODO(supabase): replace this form's action with supabase.auth.signInWithPassword
// (or a magic-link / SSO flow), and surface real validation errors instead of
// the `error` search param used by the mock action.

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams.next ?? "/dashboard/map";

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Official Dashboard sign-in</CardTitle>
          <CardDescription>For municipal health officers and building regulators.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" placeholder="you@municipality.gov" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>
            {searchParams.error && (
              <p className="text-sm text-destructive">Enter your work email to continue.</p>
            )}
            <Button type="submit" className="mt-1">
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            This is a demo sign-in — any email will grant access until Supabase Auth is wired up.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
