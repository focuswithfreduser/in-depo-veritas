"use client";

import { Archive, Download, X } from "lucide-react";
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

export function MultiSelect({
  selectedIds,
  onClearAllSelections,
}: {
  selectedIds: string[];
  onClearAllSelections: () => void;
}) {
  const utils = api.useUtils();
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteImmediately, setDeleteImmediately] = useState(false);

  const bulkTrashMutation = api.document.bulkTrash.useMutation();
  const createZipMutation = api.document.createZip.useMutation();

  const handleArchiveAll = async () => {
    setProcessing(true);

    try {
      const result = await bulkTrashMutation.mutateAsync({
        documentIds: selectedIds,
        deleteImmediately,
      });

      // Use optimistic update to remove items from cache without full invalidation
      utils.document.list.setData(undefined, (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter((doc) => !selectedIds.includes(doc.id));
      });

      // Clear selections after successful operation
      onClearAllSelections();

      toast.success(
        `${result.count} depositions ${
          deleteImmediately ? "deleted" : "archived"
        }`,
      );
    } catch (error) {
      // On error, invalidate to refresh data
      await utils.document.list.invalidate();
      toast.error("Failed to archive depositions");
    }

    setProcessing(false);
    setOpen(false);
  };

  const handleZipDownload = async () => {
    try {
      const result = await createZipMutation.mutateAsync({
        documentIds: selectedIds,
      });

      // Open the signed URL in a new tab
      window.open(result.signedUrl, "_blank");

      toast.success("ZIP download started in new tab");
    } catch (error) {
      console.error("Failed to create ZIP:", error);
      toast.error("Failed to create ZIP file. Please try again.");
    }
  };

  // Don't render if no items are selected
  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-50 border-b-2 border-primary/20 bg-background shadow-lg duration-300 animate-in slide-in-from-top-2 lg:left-52">
      <div className="container mx-auto px-6 py-6">
        {/* Desktop layout */}
        <div className="hidden items-center justify-between md:flex">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {selectedIds.length}
              </span>
              <span className="font-medium text-foreground">
                depositions selected
              </span>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={onClearAllSelections}
              icon={X}
              iconPlacement="left"
              className="underline"
            >
              Clear Selection
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Archive className="mr-2 h-4 w-4" />
                  Archive All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archive depositions</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to archive {selectedIds.length}{" "}
                    depositions? This will remove them from your active list.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="delete-immediately"
                    checked={deleteImmediately}
                    onCheckedChange={setDeleteImmediately}
                  />
                  <Label htmlFor="delete-immediately">
                    Delete immediately (permanent)
                  </Label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleArchiveAll}
                    disabled={processing}
                  >
                    {processing
                      ? "Processing..."
                      : deleteImmediately
                      ? "Delete All"
                      : "Archive All"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              size="sm"
              variant="default"
              onClick={handleZipDownload}
              disabled={createZipMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              {createZipMutation.isPending ? "Creating ZIP..." : "Download ZIP"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClearAllSelections}>
              <X />
            </Button>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="space-y-3 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {selectedIds.length}
              </span>
              <span className="font-medium text-foreground">selected</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearAllSelections}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleZipDownload}
              disabled={createZipMutation.isPending}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              {createZipMutation.isPending ? "Creating..." : "Download"}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default" className="flex-1">
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Archive depositions</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to archive {selectedIds.length}{" "}
                    depositions? This will remove them from your active list.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="delete-immediately"
                    checked={deleteImmediately}
                    onCheckedChange={setDeleteImmediately}
                  />
                  <Label htmlFor="delete-immediately">
                    Delete immediately (permanent)
                  </Label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleArchiveAll}
                    disabled={processing}
                  >
                    {processing
                      ? "Processing..."
                      : deleteImmediately
                      ? "Delete All"
                      : "Archive All"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
