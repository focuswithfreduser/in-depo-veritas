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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DataTablePagination from "@/components/ui/data-table/pagination";
import { cn } from "@/lib/utils";
import { columns } from "./columns";
import { UserAdminView } from "./types";
import { Search, Download } from "lucide-react";
import { exportUsersToCSV } from "./export-to-csv";
import { CreateUserDialog } from "./create-user-dialog";

type StatusFilter =
  | "free_forever"
  | "active_subscription"
  | "canceled_subscription"
  | "trial"
  | "expired_trial";

export default function UsersAdminTable({ data }: { data: UserAdminView[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "createdAt",
      desc: true,
    },
  ]);

  const tbodyRef = React.useRef<HTMLTableSectionElement>(null);

  const [rowSelection, setRowSelection] = React.useState({});

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const [statusFilters, setStatusFilters] = React.useState<Set<StatusFilter>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = React.useState("");

  // Calculate filter counts
  const filterCounts = React.useMemo(() => {
    // First apply search filter only
    let searchFiltered = data;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      searchFiltered = searchFiltered.filter((user) => {
        if (user.name.toLowerCase().includes(query)) return true;
        if (user.email.toLowerCase().includes(query)) return true;
        if (
          user.members.some((member) =>
            member.organization.name.toLowerCase().includes(query),
          )
        )
          return true;
        return false;
      });
    }

    // Count users for each status filter
    const counts = {
      free_forever: 0,
      active_subscription: 0,
      canceled_subscription: 0,
      trial: 0,
      expired_trial: 0,
    };

    searchFiltered.forEach((user) => {
      user.members.forEach((member) => {
        const org = member.organization;

        if (org.freeForever) {
          counts.free_forever++;
        }

        const activeSubscription = org.subscriptions?.[0];
        if (activeSubscription?.status === "active") {
          counts.active_subscription++;
        }

        if (activeSubscription?.status === "canceled") {
          counts.canceled_subscription++;
        }

        if (org.trial) {
          const hasEnded = org.trial.endsAt < new Date();
          if (!hasEnded) {
            counts.trial++;
          } else {
            counts.expired_trial++;
          }
        }
      });
    });

    return counts;
  }, [data, searchQuery]);

  // Filter data based on search and status filters
  const filteredData = React.useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user) => {
        // Search in user name
        if (user.name.toLowerCase().includes(query)) {
          return true;
        }
        // Search in user email
        if (user.email.toLowerCase().includes(query)) {
          return true;
        }
        // Search in organization names
        if (
          user.members.some((member) =>
            member.organization.name.toLowerCase().includes(query),
          )
        ) {
          return true;
        }
        return false;
      });
    }

    // Apply status filters
    if (statusFilters.size === 0) {
      return filtered;
    }

    return filtered.filter((user) => {
      // Check if user has any organization matching the selected filters
      return user.members.some((member) => {
        const org = member.organization;

        if (statusFilters.has("free_forever") && org.freeForever) {
          return true;
        }

        const activeSubscription = org.subscriptions?.[0];
        if (
          statusFilters.has("active_subscription") &&
          activeSubscription?.status === "active"
        ) {
          return true;
        }

        if (
          statusFilters.has("canceled_subscription") &&
          activeSubscription?.status === "canceled"
        ) {
          return true;
        }

        if (org.trial) {
          const hasEnded = org.trial.endsAt < new Date();
          if (statusFilters.has("trial") && !hasEnded) {
            return true;
          }
          if (statusFilters.has("expired_trial") && hasEnded) {
            return true;
          }
        }

        return false;
      });
    });
  }, [data, statusFilters, searchQuery]);

  const table = useReactTable({
    data: filteredData,
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

  const filteredRowsCount = table.getFilteredRowModel().rows.length;

  const toggleStatusFilter = (filter: StatusFilter) => {
    setStatusFilters((prev) => {
      const newFilters = new Set(prev);
      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }
      return newFilters;
    });
  };

  return (
    <div className="w-full">
      <div className="z-20 flex flex-col bg-white lg:col-span-2">
        <div className="flex items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold">Users</h3>
            <div>{filteredRowsCount} total</div>
          </div>

          <div className="flex items-center gap-2">
            <CreateUserDialog />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportUsersToCSV(filteredData)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">
                Export to CSV ({filteredRowsCount})
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="space-y-3 px-4 pb-4">
          <div>
            <div className="text-xs text-muted-foreground">
              Filters are inclusive: users appear if any of their organizations
              match any selected filter
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-free-forever"
                checked={statusFilters.has("free_forever")}
                onCheckedChange={() => toggleStatusFilter("free_forever")}
              />
              <Label
                htmlFor="filter-free-forever"
                className="cursor-pointer text-sm font-normal"
              >
                Free Forever{" "}
                <span className="text-muted-foreground">
                  ({filterCounts.free_forever})
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-active-sub"
                checked={statusFilters.has("active_subscription")}
                onCheckedChange={() =>
                  toggleStatusFilter("active_subscription")
                }
              />
              <Label
                htmlFor="filter-active-sub"
                className="cursor-pointer text-sm font-normal"
              >
                Active Subscription{" "}
                <span className="text-muted-foreground">
                  ({filterCounts.active_subscription})
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-canceled-sub"
                checked={statusFilters.has("canceled_subscription")}
                onCheckedChange={() =>
                  toggleStatusFilter("canceled_subscription")
                }
              />
              <Label
                htmlFor="filter-canceled-sub"
                className="cursor-pointer text-sm font-normal"
              >
                Canceled Subscription{" "}
                <span className="text-muted-foreground">
                  ({filterCounts.canceled_subscription})
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-trial"
                checked={statusFilters.has("trial")}
                onCheckedChange={() => toggleStatusFilter("trial")}
              />
              <Label
                htmlFor="filter-trial"
                className="cursor-pointer text-sm font-normal"
              >
                Free Trial (Active){" "}
                <span className="text-muted-foreground">
                  ({filterCounts.trial})
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-expired-trial"
                checked={statusFilters.has("expired_trial")}
                onCheckedChange={() => toggleStatusFilter("expired_trial")}
              />
              <Label
                htmlFor="filter-expired-trial"
                className="cursor-pointer text-sm font-normal"
              >
                Free Trial (Expired){" "}
                <span className="text-muted-foreground">
                  ({filterCounts.expired_trial})
                </span>
              </Label>
            </div>

            {statusFilters.size > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilters(new Set())}
                className="h-8"
              >
                Clear filters
              </Button>
            ) : (
              <div className="h-8" />
            )}
          </div>
        </div>
      </div>
      <div
        className="-mx-2 block overflow-x-auto md:mx-0"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Table className="w-full min-w-[800px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                  return (
                    <TableHead
                      // className="sticky top-0"
                      className={cn(
                        "bg-white px-4 py-3",
                        idx === 0 && "pl-2 md:pl-4",
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
                  {row.getVisibleCells().map((cell, idx) => (
                    <TableCell
                      key={cell.id}
                      className={cn(idx === 0 && "pl-2 md:pl-4")}
                    >
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
                  <div className="pb-2 text-muted-foreground">
                    No results found.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
