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

interface ToggleAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  isCurrentlyAdmin: boolean;
}

export function ToggleAdminDialog({
  open,
  onOpenChange,
  userId,
  userName,
  isCurrentlyAdmin,
}: ToggleAdminDialogProps) {
  const utils = api.useUtils();
  const toggleAdminMutation = api.admin.toggleAdminRole.useMutation({
    onSuccess: () => {
      toast.success(
        isCurrentlyAdmin
          ? "Admin status removed successfully"
          : "Admin status granted successfully",
      );
      onOpenChange(false);
      utils.admin.listUsersWithOrganizations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to toggle admin status");
    },
  });

  const handleConfirm = () => {
    toggleAdminMutation.mutate({ userId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isCurrentlyAdmin ? "Remove Admin Status" : "Grant Admin Status"}
          </DialogTitle>
          <DialogDescription>
            {isCurrentlyAdmin ? (
              <>
                Are you sure you want to remove admin status from{" "}
                <strong>{userName}</strong>? They will no longer have access to
                the admin panel.
              </>
            ) : (
              <>
                Are you sure you want to grant admin status to{" "}
                <strong>{userName}</strong>? They will have full access to the
                admin panel.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
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
            variant={isCurrentlyAdmin ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={toggleAdminMutation.isPending}
          >
            {toggleAdminMutation.isPending
              ? "Processing..."
              : isCurrentlyAdmin
                ? "Remove Admin"
                : "Grant Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
