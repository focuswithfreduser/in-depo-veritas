"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminFile } from "./types";

interface PagesModalProps {
  document: AdminFile;
  isOpen: boolean;
  onClose: () => void;
}

export function PagesModal({ document, isOpen, onClose }: PagesModalProps) {
  const [startPage, setStartPage] = useState<string>(
    document.relevantStartPage?.toString() ?? "",
  );
  const [endPage, setEndPage] = useState<string>(
    document.relevantEndPage?.toString() ?? "",
  );

  const utils = api.useUtils();

  const updateRelevantPagesMutation = api.admin.updateRelevantPages.useMutation(
    {
      onSuccess: async () => {
        await utils.admin.listFiles.invalidate();
        toast.success("Relevant pages updated successfully");
        onClose();
      },
      onError: (error) => {
        toast.error(`Failed to update relevant pages: ${error.message}`);
      },
    },
  );

  const handleSave = () => {
    if (
      !window.confirm(
        "This will reset the document. Are you sure you want to continue?",
      )
    ) {
      return;
    }

    const startPageNum = startPage.trim() === "" ? null : parseInt(startPage);
    const endPageNum = endPage.trim() === "" ? null : parseInt(endPage);

    // Validation
    if (
      startPage.trim() !== "" &&
      (isNaN(startPageNum!) || startPageNum! < 1)
    ) {
      toast.error("Start page must be a valid number greater than 0");
      return;
    }

    if (endPage.trim() !== "" && (isNaN(endPageNum!) || endPageNum! < 1)) {
      toast.error("End page must be a valid number greater than 0");
      return;
    }

    if (
      document.pageCount &&
      startPageNum &&
      startPageNum > document.pageCount
    ) {
      toast.error(
        `Start page cannot exceed total page count (${document.pageCount})`,
      );
      return;
    }

    if (document.pageCount && endPageNum && endPageNum > document.pageCount) {
      toast.error(
        `End page cannot exceed total page count (${document.pageCount})`,
      );
      return;
    }

    if (startPageNum && endPageNum && startPageNum > endPageNum) {
      toast.error("Start page cannot be greater than end page");
      return;
    }

    updateRelevantPagesMutation.mutate({
      id: document.id,
      relevantStartPage: startPageNum,
      relevantEndPage: endPageNum,
    });
  };

  const handleReset = () => {
    setStartPage(document.relevantStartPage?.toString() ?? "");
    setEndPage(document.relevantEndPage?.toString() ?? "");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Relevant Pages</DialogTitle>
          <DialogDescription>
            Set the relevant page range for {document.fileName}
            {document.pageCount && ` (Total pages: ${document.pageCount})`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startPage" className="text-right">
              Start Page
            </Label>
            <Input
              id="startPage"
              type="number"
              min="1"
              max={document.pageCount ?? undefined}
              value={startPage}
              onChange={(e) => setStartPage(e.target.value)}
              className="col-span-3"
              placeholder="Enter start page"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endPage" className="text-right">
              End Page
            </Label>
            <Input
              id="endPage"
              type="number"
              min="1"
              max={document.pageCount ?? undefined}
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              className="col-span-3"
              placeholder="Enter end page"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateRelevantPagesMutation.isPending}
          >
            {updateRelevantPagesMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
