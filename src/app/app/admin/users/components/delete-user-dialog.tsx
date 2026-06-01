"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface OrganizationInfo {
  name: string;
  isSoleMember: boolean;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  documentCount: number;
  organizations: OrganizationInfo[];
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  documentCount,
  organizations,
}: DeleteUserDialogProps) {
  const utils = api.useUtils();
  const deleteUserMutation = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      onOpenChange(false);
      utils.admin.listUsersWithOrganizations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  const handleConfirm = () => {
    deleteUserMutation.mutate({ userId });
  };

  const soleMemberOrgs = organizations.filter((org) => org.isSoleMember);
  const sharedOrgs = organizations.filter((org) => !org.isSoleMember);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{userName}</strong>? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2 text-sm">
            <p className="font-medium">This will delete:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>
                {documentCount} document{documentCount !== 1 ? "s" : ""} and
                their associated data
              </li>
              <li>User account and profile</li>
              <li>Active sessions</li>
            </ul>
            {soleMemberOrgs.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-destructive">
                  This will also delete the following organization
                  {soleMemberOrgs.length !== 1 ? "s" : ""}:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 mt-1">
                  {soleMemberOrgs.map((org) => (
                    <li key={org.name}>{org.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {sharedOrgs.length > 0 && (
              <div className="mt-4">
                <p className="font-medium">
                  This will remove them from the following organization
                  {sharedOrgs.length !== 1 ? "s" : ""}:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2 mt-1">
                  {sharedOrgs.map((org) => (
                    <li key={org.name}>{org.name}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  These organizations will not be deleted as they have other
                  members
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteUserMutation.isPending}
          >
            {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
