"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { AdminFile } from "./types";

import { CopyIdButton } from "@/components/copy-id-button";
import DataTableColumnHeader from "@/components/ui/data-table/header";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { FilterIcon, X } from "lucide-react";
import { DocumentActionsMenu } from "./document-actions-menu";

export const columns: ColumnDef<AdminFile>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fileName",
    id: "fileName",
    enableHiding: false,
    enableSorting: true,
    size: 100,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} name={"File"} />
    ),
    cell: ({ row, getValue }) => {
      const fileName = getValue<string>();
      const date = row.original.createdAt;
      const last4Id = row.original.id.slice(-4);
      return (
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-row items-center gap-1">
            <div className="flex h-auto max-w-40 items-center truncate p-0 text-left text-xs">
              {fileName}
            </div>
            <CopyIdButton
              id={fileName}
              label="Copy File Name"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            />
          </div>
          <div className="flex flex-row items-center gap-1 text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}

            <span className="font-mono text-xs">{last4Id}</span>
            <CopyIdButton
              id={row.original.id}
              label="Copy File ID"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
            />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "user.email",
    id: "userEmail",
    enableHiding: false,
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} name={"User"} />
    ),
    cell: ({ row, getValue, table }) => {
      const email = getValue<string>();
      const column = table.getColumn("userEmail");
      const currentFilters = (column?.getFilterValue() as string[]) || [];
      const isFiltered = email && currentFilters.includes(email);

      const handleEmailClick = () => {
        if (!email) return;

        const newFilters = isFiltered
          ? currentFilters.filter((f) => f !== email)
          : [...currentFilters, email];

        column?.setFilterValue(newFilters.length > 0 ? newFilters : undefined);
      };

      return (
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-row items-center gap-1">
            <div className="flex h-auto max-w-40 items-center truncate p-0 text-left text-xs">
              {email}
            </div>
            <CopyIdButton
              id={email}
              label="Copy User Email"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            />
            {isFiltered ? (
              <X
                className="h-4 w-4 cursor-pointer text-muted-foreground"
                onClick={handleEmailClick}
              />
            ) : (
              <FilterIcon
                className="h-4 w-4 cursor-pointer text-muted-foreground"
                onClick={handleEmailClick}
              />
            )}
          </div>
          <div className="flex flex-row items-center gap-1 text-xs text-muted-foreground">
            <span className="max-w-40 truncate">
              {row.original.organization?.name || "No workspace"}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    id: "status",
    enableHiding: false,
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} name={"Status"} />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant="outline" className="capitalize">
          {status}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      const status = row.getValue(id) as string;
      return value.includes(status);
    },
  },
  {
    accessorKey: "isArchived",
    id: "isArchived",
    enableHiding: false,
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} name={"Archived"} />
    ),
    cell: ({ row }) => {
      const isArchived = row.original.isArchived;
      return (
        <Badge variant="outline">{isArchived ? "Archived" : "Active"}</Badge>
      );
    },
    filterFn: (row, id, value) => {
      const isArchived = row.getValue(id) as boolean;
      return value.includes(isArchived.toString());
    },
  },
  {
    accessorKey: "createdAt",
    id: "createdAt",
  },
  {
    accessorKey: "id",
    id: "id",
  },
  {
    accessorKey: "id",
    id: "actions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} name={"Actions"} />
    ),
    cell: ({ row }) => <DocumentActionsMenu document={row.original} />,
  },
];
