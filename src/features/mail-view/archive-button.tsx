"use client";

import { Archive } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function ArchiveButton({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const utils = api.useUtils();
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteImmediately, setDeleteImmediately] = useState(false);

  const trashMutation = api.document.trash.useMutation();

  const handleArchive = async () => {
    setProcessing(true);

    try {
      await trashMutation.mutateAsync({
        documentId,
        deleteImmediately,
      });

      // Use optimistic update to remove item from cache without full invalidation
      utils.document.list.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((doc) => doc.id !== documentId);
      });

      toast.success(
        `${fileName} ${deleteImmediately ? "deleted" : "archived"}`,
      );
    } catch (error) {
      // On error, invalidate to refresh data
      await utils.document.list.invalidate();
      toast.error("Failed to archive document");
    }

    setProcessing(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto w-20 flex-col px-1 py-1"
        >
          <Archive className="mb-0.5 h-3 w-3" />
          <span className="whitespace-normal break-words text-center text-[10px] leading-tight">
            Archive
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Archive File</DialogTitle>
          <DialogDescription>
            Are you sure you would like to archive "{fileName}"?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4 text-sm text-muted-foreground">
            This file will be scheduled to be deleted in 60 days, regardless.
          </p>
          <div className="flex items-center space-x-2">
            <Switch
              id="delete-immediately"
              checked={deleteImmediately}
              onCheckedChange={setDeleteImmediately}
            />
            <Label htmlFor="delete-immediately">Delete immediately</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            icon={Archive}
            iconPlacement="right"
            onClick={handleArchive}
            disabled={processing}
          >
            {processing
              ? "Processing..."
              : deleteImmediately
              ? "Delete"
              : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
