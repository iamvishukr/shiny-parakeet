import React, { useEffect } from "react";
import { Button } from "../ui/button";
import { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";

interface PaginationProps<T> {
  table: Table<T>;
}

function Pagination<T>({ table }: PaginationProps<T>) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();

  useEffect(() => {
    if (table.getState().pagination.pageSize === 10) {
      // Update only if it's still the TanStack default (10)
      table.setPageSize(30);
    }
  }, [table]);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-3 border-t mt-4">
      {/* Left Section */}
      <div className="text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected
      </div>

      {/* Middle Section */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <span className="text-sm font-medium">
          Page <span className="font-semibold">{currentPage}</span> of{" "}
          <span className="font-semibold">{totalPages}</span>
        </span>

        <Button
          size="sm"
          variant="outline"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => table.setPageIndex(totalPages - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <Select
          value={String(table.getState().pagination.pageSize)}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="Rows" />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 30, 50].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default Pagination;
