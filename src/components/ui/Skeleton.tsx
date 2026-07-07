import { cn } from "@/lib/utils";

/**
 * Shimmer skeleton primitives.
 * All use GPU-accelerated background-position animation (transform equivalent).
 */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ct-shimmer rounded-md", className)} />;
}

/** A full dashboard stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="bg-card p-4 rounded-xl border border-border flex flex-col items-center text-center gap-2">
      <Skeleton className="w-6 h-6 rounded-full" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-7 w-10" />
    </div>
  );
}

/** Dashboard "next to watch" row skeleton */
export function WatchRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border">
      <Skeleton className="w-6 h-4 rounded" />
      <Skeleton className="w-12 h-16 rounded shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Genre legend row skeleton */
export function GenreRowSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-3 h-3 rounded-full shrink-0" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-8" />
    </div>
  );
}

/** Recommendation preview card skeleton */
export function RecPreviewSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-background rounded-lg border border-border">
      <Skeleton className="w-16 h-24 rounded shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Horizontal movie card skeleton (used in Discover rows) */
export function MovieCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-36 md:w-44 shrink-0", className)}>
      <Skeleton className="w-full aspect-[2/3] rounded-xl" />
      <Skeleton className="h-3 w-4/5 mt-2" />
      <Skeleton className="h-3 w-2/5 mt-1.5" />
    </div>
  );
}

/** Library poster card skeleton */
export function LibraryCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Skeleton className="w-full aspect-[2/3] rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

/** Admin table row skeleton */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-t border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/** Profile card skeleton */
export function ProfileCardSkeleton() {
  return (
    <div className="bg-card border border-border p-6 rounded-xl space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-4 pt-4 border-t border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
