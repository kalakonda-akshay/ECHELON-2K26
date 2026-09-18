import { Skeleton } from "@/components/ui/skeleton";

/**
 * Used inside any client component under /dashboard that reads auth state
 * with useAuth()/useUser() (e.g. a widget that needs the role client-side).
 * The server-rendered layout (app/dashboard/layout.tsx) already blocks
 * unauthenticated requests before anything renders, so this only covers the
 * brief moment Clerk's client SDK takes to hydrate on the client — it
 * prevents a flash of empty/unauthenticated UI while `isLoaded` is false.
 *
 *   const { isLoaded, userId } = useAuth();
 *   if (!isLoaded) return <DashboardSkeleton />;
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
