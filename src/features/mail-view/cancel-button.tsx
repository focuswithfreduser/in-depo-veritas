"use client";

import { X } from "lucide-react";
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
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function CancelButton({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const utils = api.useUtils();
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);

  const trashMutation = api.document.trash.useMutation();

  const handleCancel = async () => {
    setProcessing(true);

    try {
      await trashMutation.mutateAsync({
        documentId,
        deleteImmediately: true, // Always delete immediately for processing documents
      });

      // Use optimistic update to remove item from cache without full invalidation
      utils.document.list.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((doc) => doc.id !== documentId);
      });

      toast.success(`${fileName} processing cancelled`);
    } catch (error) {
      // On error, invalidate to refresh data
      await utils.document.list.invalidate();
      toast.error("Failed to cancel document");
    }

    setProcessing(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <X />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Processing</DialogTitle>
          <DialogDescription>
            Are you sure you would like to cancel processing "{fileName}"?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            icon={X}
            iconPlacement="right"
            onClick={handleCancel}
            disabled={processing}
          >
            {processing ? "Cancelling..." : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
