"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";
import { CloneToWorkspaceModal } from "./clone-to-workspace-modal";

interface CloneToWorkspaceButtonProps {
  selectedDocumentIds: string[];
  selectedDocuments?: Array<{
    id: string;
    fileName: string | null;
    organization: { name: string } | null;
  }>;
  onCloneComplete?: () => void;
}

export function CloneToWorkspaceButton({
  selectedDocumentIds,
  selectedDocuments,
  onCloneComplete,
}: CloneToWorkspaceButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (selectedDocumentIds.length === 0 || selectedDocumentIds.length > 5) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="gap-2"
      >
        <Copy className="h-4 w-4" />
        Clone to Workspace
      </Button>
      <CloneToWorkspaceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDocumentIds={selectedDocumentIds}
        selectedDocuments={selectedDocuments}
        onCloneComplete={onCloneComplete}
      />
    </>
  );
}
