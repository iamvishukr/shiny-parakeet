"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  showActions?: boolean;
  showPagination?: boolean;
}

export default function TableSkeleton({
  columnCount = 6,
  rowCount = 5,
  showActions = true,
  showPagination = true,
}: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4">
      {/* Table Actions Skeleton */}
      {showActions && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
      )}

      {/* Table Header and Body Skeleton */}
      <div className="rounded-md border">
        <div className="border-b">
          <div className="flex items-center h-11 px-4">
            {[...Array(columnCount)].map((_, i) => (
              <div key={i} className="flex-1 px-2">
                <Skeleton className="h-4 w-[80%]" />
              </div>
            ))}
          </div>
        </div>

        {[...Array(rowCount)].map((_, rowIndex) => (
          <div key={rowIndex} className="border-b last:border-none">
            <div className="flex items-center h-16 px-4">
              {[...Array(columnCount)].map((_, colIndex) => (
                <div key={colIndex} className="flex-1 px-2">
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[100px]" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-[35px]" />
            <Skeleton className="h-8 w-[35px]" />
            <Skeleton className="h-8 w-[35px]" />
          </div>
        </div>
      )}
    </div>
  );
} 