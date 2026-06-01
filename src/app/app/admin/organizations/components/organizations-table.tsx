"use client";

import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { GrClose } from "react-icons/gr";
import { Button } from "@/components/ui/button";
import DataTablePagination from "@/components/ui/data-table/pagination";
import { cn } from "@/lib/utils";
import { columns } from "./columns";
import { OrganizationsAdminView } from "./types";

export default function OrganizationsTable({
  data,
  refetch,
}: {
  data: OrganizationsAdminView[];
  refetch: () => Promise<unknown>;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "id",
      desc: true,
    },
  ]);

  const tbodyRef = React.useRef<HTMLTableSectionElement>(null);

  const [rowSelection, setRowSelection] = React.useState({});

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility: {
        // id: false,
        id: false,
        // isShownInReport: false,
      },
      rowSelection,
      columnFilters,
    },
    // filterFns: {
    //   isWithinRange: isWithinRange,
    // },
    enableRowSelection: true,
    onSortingChange: setSorting,
    // onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const rowRefs = React.useRef<(HTMLTableRowElement | null)[]>([]);
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number | null>(
    null,
  );

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case "k":
        if (focusedRowIndex === null) {
          setFocusedRowIndex(0);
        } else if (focusedRowIndex > 0) {
          setFocusedRowIndex(focusedRowIndex - 1);
        }
        break;
      case "j":
        if (focusedRowIndex === null) {
          setFocusedRowIndex(0);
        } else if (focusedRowIndex < data.length - 1) {
          setFocusedRowIndex(focusedRowIndex + 1);
        }
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    if (focusedRowIndex !== null && rowRefs.current[focusedRowIndex]) {
      rowRefs.current[focusedRowIndex]?.focus();
    }
  }, [focusedRowIndex]);

  React.useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedRowIndex, data.length]);

  const filteredRowsCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="">
      <div className="z-20 flex flex-col bg-white lg:col-span-2">
        <div className="flex items-center justify-start gap-2">
          <h3 className="p-4 text-xl font-semibold">Organizations</h3>
          <div>{filteredRowsCount} total</div>
          {columnFilters.length ? (
            <Button
              onClick={() => {
                setColumnFilters([]);
              }}
            >
              <GrClose />
            </Button>
          ) : null}
        </div>
      </div>
      <Table className="w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, idx) => {
                return (
                  <TableHead
                    // className="sticky top-0"
                    className={cn(
                      "bg-white px-4 py-3",
                      // idx === 0 && "sticky ",
                    )}
                    key={header.id}
                    colSpan={header.colSpan}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody ref={tbodyRef}>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, index) => (
              <TableRow
                tabIndex={0}
                key={row.id}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                onKeyDown={(event) => {
                  if (event.key === "x") {
                    row.toggleSelected();
                  }
                }}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, {
                      ...cell.getContext(),
                      refetch,
                    })}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <div className="pb-2 text-muted-foreground">
                  No results found.
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <DataTablePagination table={table} />
    </div>
  );
}
