"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

type TeamMember = {
  id: string;
  userId: string | null;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  status: "active" | "pending";
  createdAt: Date;
  invitedBy?: string;
  expiresAt?: Date;
};

interface TeamTableProps {
  data: TeamMember[];
  currentUserId: string;
}

export function TeamTable({ data, currentUserId }: TeamTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    member: TeamMember | null;
  }>({ open: false, member: null });

  const utils = api.useUtils();

  const removeMemberMutation = api.organization.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed successfully");
      setDeleteDialog({ open: false, member: null });
      utils.organization.listTeamMembers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove member");
    },
  });

  const removeInvitationMutation =
    api.organization.removeInvitation.useMutation({
      onSuccess: () => {
        toast.success("Invitation removed successfully");
        setDeleteDialog({ open: false, member: null });
        utils.organization.listTeamMembers.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to remove invitation");
      },
    });

  const handleDelete = (member: TeamMember) => {
    setDeleteDialog({ open: true, member });
  };

  const confirmDelete = () => {
    if (!deleteDialog.member) return;

    if (deleteDialog.member.status === "pending") {
      removeInvitationMutation.mutate({
        invitationId: deleteDialog.member.id,
      });
    } else {
      removeMemberMutation.mutate({
        memberId: deleteDialog.member.id,
      });
    }
  };

  const columns: ColumnDef<TeamMember>[] = [
    {
      accessorKey: "name",
      header: "Member",
      cell: ({ row }) => {
        const member = row.original;
        const initials = member.name
          ? member.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
          : member.email[0].toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={member.image || undefined}
                alt={member.name || member.email}
              />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{member.name || member.email}</span>
              {member.name && (
                <span className="text-sm text-muted-foreground">
                  {member.email}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as "active" | "pending";
        return (
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {status === "active" ? "Active" : "Pending"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Added",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(date), { addSuffix: true })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const member = row.original;
        const isCurrentUser = member.userId === currentUserId;

        if (isCurrentUser) {
          return null;
        }

        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(member)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const isDeleting =
    removeMemberMutation.isPending || removeInvitationMutation.isPending;

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
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
                  No team members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, member: deleteDialog.member })
        }
        onConfirm={confirmDelete}
        title={
          deleteDialog.member?.status === "pending"
            ? "Remove invitation"
            : "Remove team member"
        }
        description={
          deleteDialog.member?.status === "pending"
            ? `Are you sure you want to remove the invitation for ${deleteDialog.member?.email}? This action cannot be undone.`
            : `Are you sure you want to remove ${
                deleteDialog.member?.name || deleteDialog.member?.email
              } from the team? This action cannot be undone.`
        }
        isLoading={isDeleting}
      />
    </>
  );
}
