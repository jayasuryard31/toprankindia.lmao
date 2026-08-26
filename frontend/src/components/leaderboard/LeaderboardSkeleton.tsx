import { Skeleton } from '@/components/ui/Skeleton'

/** Mirrors the real layout so nothing jumps when the data lands. */
export function LeaderboardSkeleton() {
  return (
    <div className="animate-fade" aria-hidden="true">
      <div className="grid gap-3 md:grid-cols-3 md:items-end md:gap-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`flex flex-col gap-5 rounded-lg border border-line bg-surface p-5 ${
              index === 0 ? 'md:order-2 md:pb-8' : index === 1 ? 'md:order-1' : 'md:order-3'
            }`}
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-24" rounded="sm" />
              <Skeleton className="h-4 w-8" rounded="sm" />
            </div>
            <div className="flex gap-3.5">
              <Skeleton className="size-12 shrink-0" rounded="lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" rounded="sm" />
                <Skeleton className="h-3 w-1/2" rounded="sm" />
                <Skeleton className="h-3 w-full" rounded="sm" />
              </div>
            </div>
            <Skeleton className="h-9 w-36" rounded="sm" />
            <div className="flex items-center justify-between border-t border-line pt-4">
              <Skeleton className="h-7 w-28" rounded="full" />
              <Skeleton className="h-8 w-16" rounded="md" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-line px-4 py-4 first:border-t-0"
          >
            <Skeleton className="size-4" rounded="sm" />
            <Skeleton className="size-9 shrink-0" rounded="lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" rounded="sm" />
              <Skeleton className="h-3 w-24" rounded="sm" />
            </div>
            <Skeleton className="hidden h-4 w-20 md:block" rounded="sm" />
            <Skeleton className="h-5 w-16" rounded="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
