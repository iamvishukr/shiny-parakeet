"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  hasHeader?: boolean;
  hasFooter?: boolean;
  contentRows?: number;
}

export default function CardSkeleton({
  hasHeader = true,
  hasFooter = false,
  contentRows = 3,
}: CardSkeletonProps) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Card Header */}
      {hasHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-[140px]" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      )}

      {/* Card Content */}
      <div className="space-y-3">
        {[...Array(contentRows)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>

      {/* Card Footer */}
      {hasFooter && (
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[60px]" />
        </div>
      )}
    </div>
  );
} 