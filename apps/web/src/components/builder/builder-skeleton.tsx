import { Skeleton } from "@/components/ui/skeleton";

export function BuilderSkeleton() {
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background" aria-busy aria-label="Loading builder">
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <Skeleton className="h-9 w-48" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-80 shrink-0 flex-col gap-3 border-r p-4 lg:flex">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-7 w-full" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-36 rounded-lg" />
            ))}
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="grid flex-1 grid-cols-2 content-start gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-56 rounded-xl" />
            ))}
          </div>
          <div className="flex items-center gap-3 border-t p-3">
            <Skeleton className="h-6 w-40" />
          </div>
        </main>
      </div>
    </div>
  );
}
