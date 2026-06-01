"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";

import DataTableColumnHeader from "@/components/ui/data-table/header";
import { UserAdminView } from "./types";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { OrganizationSheet } from "../../organizations/components/organization-sheet";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { ToggleAdminDialog } from "./toggle-admin-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";

const columnHelper = createColumnHelper<UserAdminView>();

export const columns = [
  columnHelper.accessor("id", {
    id: "id",
  }),
  columnHelper.accessor("firstName", {
    id: "firstName",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} name={"First Name"} />;
    },
    cell: (props) => {
      const value = props.getValue<string>();
      return (
        <div className="flex items-center gap-1">
          <div>{value}</div>
          <CopyToClipboard text={value} />
        </div>
      );
    },
  }),
  columnHelper.accessor("name", {
    id: "name",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} name={"Name"} />;
    },
    cell: (props) => {
      const value = props.getValue<string>();
      return (
        <div className="flex items-center gap-1">
          <div>{value}</div>
          <CopyToClipboard text={value} />
        </div>
      );
    },
  }),
  columnHelper.accessor("email", {
    id: "email",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} name={"Email"} />;
    },
    cell: (props) => {
      const value = props.getValue<string>();
      return (
        <div className="flex items-center gap-1">
          <div className="text-sm">{value}</div>
          <CopyToClipboard text={value} />
        </div>
      );
    },
  }),
  columnHelper.accessor("_count", {
    id: "documentCount",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} name={"Documents"} />;
    },
    cell: (props) => {
      const count = props.getValue<{ documents: number }>();
      const userId = props.row.original.id;

      if (count.documents === 0) {
        return <div className="text-sm text-muted-foreground">0</div>;
      }

      // Create URL with user email filter (documents table filters by email)
      const userEmail = props.row.original.email;
      const filters = encodeURIComponent(
        JSON.stringify([{ id: "userEmail", value: [userEmail] }]),
      );
      const url = `/app/admin/documents?filters=${filters}`;

      return (
        <Link href={url} className="text-lg hover:underline">
          {count.documents} <ChevronRight className="inline h-4 w-4" />
        </Link>
      );
    },
  }),
  columnHelper.accessor("members", {
    id: "organizations",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} name={"Organizations"} />
    ),
    cell: ({ row }) => {
      const members = row.original.members;
      return <OrganizationsCell members={members} />;
    },
  }),
  columnHelper.accessor("role", {
    id: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} name={"Admin"} />
    ),
    cell: ({ row }) => {
      const role = row.original.role;
      return role === "admin" ? (
        <Badge variant="default">Admin</Badge>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    id: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} name={"Joined"} />
    ),
    cell: ({ row }) => {
      const date = row.getValue<Date>("createdAt");
      return (
        <div className="text-sm">
          {date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor(
    (row) => {
      // Return the last session date, or null if no sessions
      return row.sessions && row.sessions.length > 0
        ? row.sessions[0].createdAt
        : null;
    },
    {
      id: "lastActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} name={"Last Active"} />
      ),
      cell: ({ row }) => {
        const sessions = row.original.sessions;
        if (!sessions || sessions.length === 0) {
          return <div className="text-sm text-muted-foreground">Never</div>;
        }
        const lastSession = sessions[0];
        return (
          <div className="text-sm">
            {lastSession.createdAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(lastSession.createdAt, { addSuffix: true })}
            </div>
          </div>
        );
      },
      sortingFn: (rowA, rowB, columnId) => {
        const dateA = rowA.getValue<Date | null>(columnId);
        const dateB = rowB.getValue<Date | null>(columnId);

        // Handle null values (users with no sessions)
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; // Push nulls to the end
        if (!dateB) return -1;

        return dateA.getTime() - dateB.getTime();
      },
    },
  ),
  columnHelper.display({
    id: "actions",
    cell: ({ row }) => {
      return (
        <UserAdminRowActions
          userId={row.original.id}
          userName={row.original.name}
          isAdmin={row.original.role === "admin"}
          documentCount={row.original._count.documents}
        />
      );
    },
  }),
];

function OrganizationsCell({
  members,
}: {
  members: Array<{
    organization: {
      id: string;
      name: string;
      status?: {
        label: string;
      };
    };
  }>;
}) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!members || members.length === 0) {
    return <span className="text-muted-foreground">No organizations</span>;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <div
            key={member.organization.id}
            className="flex flex-wrap items-center gap-2"
          >
            <Button
              variant="link"
              size="sm"
              className="inline-flex h-auto items-center gap-1 p-0 text-sm"
              onClick={() => {
                setSelectedOrgId(member.organization.id);
                setSheetOpen(true);
              }}
            >
              {member.organization.name}
              <ChevronRight className="h-3 w-3" />
            </Button>
            {member.organization.status && (
              <Badge variant="outline" className="text-xs">
                {member.organization.status.label}
              </Badge>
            )}
          </div>
        ))}
      </div>
      <OrganizationSheet
        organizationId={selectedOrgId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}

function UserAdminRowActions({
  userId,
  userName,
  isAdmin,
  documentCount,
}: {
  userId: string;
  userName: string;
  isAdmin: boolean;
  documentCount: number;
}) {
  const [toggleAdminDialogOpen, setToggleAdminDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: organizations } = api.admin.getUserOrganizations.useQuery(
    { userId },
    { enabled: deleteDialogOpen },
  );

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await authClient.admin.impersonateUser({
        userId, // required
      });
    },
  });

  const resendInviteMutation = api.admin.resendInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite email sent successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invite");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => impersonateMutation.mutate(userId)}>
            Login as
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setToggleAdminDialogOpen(true)}>
            {isAdmin ? "Remove Admin" : "Make Admin"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => resendInviteMutation.mutate({ userId })}
            disabled={resendInviteMutation.isPending}
          >
            {resendInviteMutation.isPending ? "Sending..." : "Resend Invite"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ToggleAdminDialog
        open={toggleAdminDialogOpen}
        onOpenChange={setToggleAdminDialogOpen}
        userId={userId}
        userName={userName}
        isCurrentlyAdmin={isAdmin}
      />
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        userId={userId}
        userName={userName}
        documentCount={documentCount}
        organizations={organizations || []}
      />
    </>
  );
}
