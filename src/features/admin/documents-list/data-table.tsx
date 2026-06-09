"use client";

import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTableFacetedFilter } from "@/components/ui/data-table/faceted-filter";
import DataTablePagination from "@/components/ui/data-table/pagination";
import {
  Archive,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Trash2,
  Upload,
  User,
  XCircle,
} from "lucide-react";
import { DocumentStatus } from "@/app/generated/prisma";
import { useRouter, useSearchParams } from "next/navigation";
import { GrClose } from "react-icons/gr";
import { columns } from "./columns";
import { AdminFile } from "./types";
import { CloneToWorkspaceButton } from "./clone-to-workspace-button";

export default function FilesDataTable({ data }: { data: AdminFile[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize all table state from URL search params
  const getInitialTableState = React.useCallback(() => {
    // Row Selection
    const selectedParam = searchParams.get("selected");
    const rowSelection = selectedParam
      ? (() => {
          try {
            const selectedIds = selectedParam.split(",").filter(Boolean);
            return selectedIds.reduce(
              (acc, id) => ({ ...acc, [id]: true }),
              {},
            );
          } catch {
            return {};
          }
        })()
      : {};

    // Sorting
    const sortParam = searchParams.get("sort");
    const sorting: SortingState = sortParam
      ? (() => {
          try {
            const [id, desc] = sortParam.split(":");
            return [{ id, desc: desc === "desc" }];
          } catch {
            return [{ id: "createdAt", desc: true }];
          }
        })()
      : [{ id: "createdAt", desc: true }];

    // Column Filters
    const filtersParam = searchParams.get("filters");
    const columnFilters: ColumnFiltersState = filtersParam
      ? (() => {
          try {
            return JSON.parse(decodeURIComponent(filtersParam));
          } catch {
            return [{ id: "isArchived", value: ["false"] }];
          }
        })()
      : [{ id: "isArchived", value: ["false"] }];

    // Global Filter
    const globalFilter = searchParams.get("search") || "";

    // Column Visibility - hard-coded default
    const columnVisibility: VisibilityState = {
      id: false,
      createdAt: false,
      isArchived: false,
    };

    return {
      rowSelection,
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    };
  }, [searchParams]);

  const initialState = getInitialTableState();

  const [sorting, setSorting] = React.useState<SortingState>(
    initialState.sorting,
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState.columnFilters,
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState.columnVisibility);
  const [rowSelection, setRowSelection] = React.useState(
    initialState.rowSelection,
  );
  const [globalFilter, setGlobalFilter] = React.useState(
    initialState.globalFilter,
  );

  // URL update function (no longer handles visibility)
  const updateUrl = React.useCallback(
    (updates: {
      rowSelection?: Record<string, boolean>;
      sorting?: SortingState;
      columnFilters?: ColumnFiltersState;
      globalFilter?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Row Selection
      if (updates.rowSelection !== undefined) {
        const selectedIds = Object.keys(updates.rowSelection).filter(
          (id) => updates.rowSelection![id],
        );
        if (selectedIds.length > 0) {
          params.set("selected", selectedIds.join(","));
        } else {
          params.delete("selected");
        }
      }

      // Sorting
      if (updates.sorting !== undefined) {
        if (updates.sorting.length > 0) {
          const { id, desc } = updates.sorting[0];
          // Only store if different from default
          if (id !== "createdAt" || !desc) {
            params.set("sort", `${id}:${desc ? "desc" : "asc"}`);
          } else {
            params.delete("sort");
          }
        } else {
          params.delete("sort");
        }
      }

      // Column Filters
      if (updates.columnFilters !== undefined) {
        if (updates.columnFilters.length > 0) {
          params.set(
            "filters",
            encodeURIComponent(JSON.stringify(updates.columnFilters)),
          );
        } else {
          params.delete("filters");
        }
      }

      // Global Filter
      if (updates.globalFilter !== undefined) {
        if (updates.globalFilter) {
          params.set("search", updates.globalFilter);
        } else {
          params.delete("search");
        }
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // Custom handlers that update both state and URL
  const handleRowSelectionChange = React.useCallback(
    (updaterOrValue: any) => {
      const newSelection =
        typeof updaterOrValue === "function"
          ? updaterOrValue(rowSelection)
          : updaterOrValue;
      setRowSelection(newSelection);
      setTimeout(() => updateUrl({ rowSelection: newSelection }), 0);
    },
    [rowSelection, updateUrl],
  );

  const handleSortingChange = React.useCallback(
    (updaterOrValue: any) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;
      setSorting(newSorting);
      setTimeout(() => updateUrl({ sorting: newSorting }), 0);
    },
    [sorting, updateUrl],
  );

  const handleColumnFiltersChange = React.useCallback(
    (updaterOrValue: any) => {
      const newFilters =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnFilters)
          : updaterOrValue;
      setColumnFilters(newFilters);
      setTimeout(() => updateUrl({ columnFilters: newFilters }), 0);
    },
    [columnFilters, updateUrl],
  );

  const handleGlobalFilterChange = React.useCallback(
    (value: string) => {
      setGlobalFilter(value);
      setTimeout(() => updateUrl({ globalFilter: value }), 0);
    },
    [updateUrl],
  );

  const handleColumnVisibilityChange = React.useCallback(
    (updaterOrValue: any) => {
      const newVisibility =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnVisibility)
          : updaterOrValue;
      setColumnVisibility(newVisibility);
      // No longer syncing visibility to URL
    },
    [columnVisibility],
  );

  // Effect to sync state when URL changes (navigation/refresh)
  React.useEffect(() => {
    const newState = getInitialTableState();
    setSorting(newState.sorting);
    setColumnFilters(newState.columnFilters);
    // Column visibility is no longer synced from URL - keep current state
    setRowSelection(newState.rowSelection);
    setGlobalFilter(newState.globalFilter);
  }, [getInitialTableState]);

  // Global filter function that searches across multiple fields
  const globalFilterFn = React.useCallback(
    (row: any, columnId: string, value: string) => {
      if (!value) return true;

      const searchValue = value.toLowerCase();
      const rowData = row.original as AdminFile;

      // Search across multiple fields
      const searchableFields = [
        rowData.user?.email || "",
        rowData.fileName || "",
        rowData.organization?.name || "",
        rowData.id || "",
      ];

      return searchableFields.some((field) =>
        field.toLowerCase().includes(searchValue),
      );
    },
    [],
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: handleRowSelectionChange,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => row.id, // Use document ID as row ID for selection
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  // Values must match the raw DocumentStatus enum members stored on the
  // document (the status column's filterFn compares against row.getValue).
  // Using the generated enum keeps these in sync if the DB statuses change.
  const statusOptions = [
    {
      label: "Uploading",
      value: DocumentStatus.uploading,
      icon: Upload,
    },
    {
      label: "Pending",
      value: DocumentStatus.pending,
      icon: Clock,
    },
    {
      label: "Processing",
      value: DocumentStatus.processing,
      icon: Loader2,
    },
    {
      label: "Finalizing",
      value: DocumentStatus.finalizing,
      icon: Loader2,
    },
    {
      label: "Complete",
      value: DocumentStatus.complete,
      icon: CheckCircle,
    },
    {
      label: "Failed",
      value: DocumentStatus.failed,
      icon: XCircle,
    },
    {
      label: "Deleted",
      value: DocumentStatus.deleted,
      icon: Trash2,
    },
  ];

  // Get unique email values for the filter
  const emailOptions = React.useMemo(() => {
    const uniqueEmails = Array.from(
      new Set(data.map((item) => item.user?.email).filter(Boolean)),
    ).sort();

    return uniqueEmails.map((email) => ({
      label: email,
      value: email,
      icon: User,
    }));
  }, [data]);

  const archivedOptions = [
    {
      label: "Active",
      value: "false",
      icon: CheckCircle,
    },
    {
      label: "Archived",
      value: "true",
      icon: Archive,
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 py-4">
        <h3 className="text-xl font-semibold">Files</h3>
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} total
        </div>

        {/* Status Filter */}
        <DataTableFacetedFilter
          column={table.getColumn("status")}
          title="Status"
          options={statusOptions}
        />

        {/* Email Filter */}
        {emailOptions.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("userEmail")}
            title="User"
            options={emailOptions}
          />
        )}

        {/* Archived Filter */}
        <DataTableFacetedFilter
          column={table.getColumn("isArchived")}
          title="Archive"
          options={archivedOptions}
        />
      </div>

      {/* Search Input Row */}
      <div className="flex items-center gap-2 pb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, file name, organization, document ID, or group ID..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-8"
          />
        </div>

        <CloneToWorkspaceButton
          selectedDocumentIds={Object.keys(rowSelection).filter(
            (id) => (rowSelection as Record<string, boolean>)[id],
          )}
          selectedDocuments={data
            .filter((doc) => (rowSelection as Record<string, boolean>)[doc.id])
            .map((doc) => ({
              id: doc.id,
              fileName: doc.fileName,
              organization: doc.organization,
            }))}
          onCloneComplete={() => {
            setRowSelection({});
            updateUrl({ rowSelection: {} });
          }}
        />

        {(columnFilters.length > 0 || globalFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setColumnFilters([]);
              setGlobalFilter("");
              setRowSelection({});
              setSorting([{ id: "createdAt", desc: true }]);
              setTimeout(() => {
                updateUrl({
                  columnFilters: [],
                  globalFilter: "",
                  rowSelection: {},
                  sorting: [{ id: "createdAt", desc: true }],
                });
              }, 0);
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <GrClose className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
