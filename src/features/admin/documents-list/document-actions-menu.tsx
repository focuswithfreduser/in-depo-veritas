"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/trpc/react";
import {
  Archive,
  ArchiveRestore,
  Building,
  Camera,
  Edit,
  ExternalLink,
  Loader2,
  LucideIcon,
  MoreVertical,
  OctagonAlert,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionButton } from "./action-button";
import { PagesModal } from "./pages-modal";
import { AdminFile } from "./types";

interface DocumentActionsMenuProps {
  document: AdminFile;
}

export function DocumentActionsMenu({ document }: DocumentActionsMenuProps) {
  const [isPagesModalOpen, setIsPagesModalOpen] = useState(false);
  const utils = api.useUtils();

  const screenshotAndDownloadMutation = api.admin.screenshot.useMutation({
    onSuccess: async ({ filePath }) => {
      await utils.admin.listFiles.invalidate();

      // Create a temporary link element to trigger download
      const link = window.document.createElement("a");
      link.href = filePath;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast.success("Screenshot and download complete");

      console.log("Screenshot filePath:", filePath);
    },
    onError: (error) => {
      toast.error(`Failed to screenshot and download: ${error.message}`);
    },
  });

  const resetDocumentMutation = api.admin.resetDocument.useMutation({
    onSuccess: async () => {
      await utils.admin.listFiles.invalidate();
      toast.success("Document reset complete");
    },
    onError: (error) => {
      toast.error(`Failed to reset document: ${error.message}`);
    },
  });

  const retryWebMutation = api.admin.retryWeb.useMutation({
    onSuccess: async () => {
      await utils.admin.listFiles.invalidate();
      toast.success("Web retry complete");
    },
    onError: (error) => {
      toast.error(`Failed to retry web: ${error.message}`);
    },
  });

  const triggerSummary = api.admin.triggerSummary.useMutation({
    onSuccess: async () => {
      await utils.admin.listFiles.invalidate();
      toast.success("Web retry complete");
    },
    onError: (error) => {
      toast.error(`Failed to retry web: ${error.message}`);
    },
  });

  const archiveDocumentMutation = api.admin.archiveDocument.useMutation({
    onSuccess: async () => {
      await utils.admin.listFiles.invalidate();
      toast.success("Document archived");
    },
    onError: (error) => {
      toast.error(`Failed to archive document: ${error.message}`);
    },
  });

  const unarchiveDocumentMutation = api.admin.unarchiveDocument.useMutation({
    onSuccess: async () => {
      await utils.admin.listFiles.invalidate();
      toast.success("Document unarchived");
    },
    onError: (error) => {
      toast.error(`Failed to unarchive document: ${error.message}`);
    },
  });

  const getTriggerUrl = (triggerId: string) => {
    const env = process.env.NODE_ENV === "production" ? "prod" : "dev";
    return `https://cloud.trigger.dev/orgs/res-ipsa-ai-9811/projects/res-ipsa-ai-summary-4I70/env/${env}/runs/${triggerId}`;
  };

  return (
    <div className="flex items-start gap-2">
      <div className="flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => retryWebMutation.mutate({ id: document.id })}
              disabled={retryWebMutation.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Web Summary
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => triggerSummary.mutate({ id: document.id })}
              disabled={triggerSummary.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Trigger Summary
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsPagesModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Pages ({formatPageRange(document)})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => resetDocumentMutation.mutate({ id: document.id })}
              disabled={resetDocumentMutation.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              reset
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {document.isArchived ? (
              <DropdownMenuItem
                onClick={() =>
                  unarchiveDocumentMutation.mutate({ id: document.id })
                }
                disabled={unarchiveDocumentMutation.isPending}
              >
                <ArchiveRestore className="mr-2 h-4 w-4" />
                unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  archiveDocumentMutation.mutate({ id: document.id })
                }
                disabled={archiveDocumentMutation.isPending}
              >
                <Archive className="mr-2 h-4 w-4" />
                archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                screenshotAndDownloadMutation.mutate({
                  id: document.id,
                  isFull: false,
                })
              }
              disabled={screenshotAndDownloadMutation.isPending}
            >
              <Camera className="mr-2 h-4 w-4" />
              summary screenshot
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                screenshotAndDownloadMutation.mutate({
                  id: document.id,
                  isFull: true,
                })
              }
              disabled={screenshotAndDownloadMutation.isPending}
            >
              <Building className="mr-2 h-4 w-4" />
              full screenshot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ActionButton
          icon={ExternalLink}
          label="trigger"
          disabled={!document.triggerId}
          href={
            document.triggerId ? getTriggerUrl(document.triggerId) : undefined
          }
          target="_blank"
          rel="noopener noreferrer"
        />
        <div className="flex flex-row items-center gap-8">
          <OriginalLink
            documentId={document.id}
            name={document.fileName}
            fileUrl={document.fileUrl}
          />

          <SummaryLink
            documentId={document.id}
            summaryUrl={document.summaryUrl}
          />
          <WebViewLink documentId={document.id} name={document.fileName} />
        </div>
      </div>

      <PagesModal
        document={document}
        isOpen={isPagesModalOpen}
        onClose={() => setIsPagesModalOpen(false)}
      />
    </div>
  );
}

function DownloadLink({
  summaryUrl,
  icon,
  label,
  disabled = false,
  onClick,
}: {
  summaryUrl?: string | null;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const downloadMutation = api.document.getSignedPDFUrl.useMutation();

  const handleDownload = async () => {
    if (onClick) {
      onClick();
      return;
    }

    if (!summaryUrl) {
      return;
    }

    const signedUrl = await downloadMutation.mutateAsync({
      url: summaryUrl,
    });
    window.open(signedUrl, "_blank");
  };

  return (
    <ActionButton
      icon={downloadMutation.isPending ? Loader2 : icon}
      label={label}
      onClick={handleDownload}
      disabled={disabled || downloadMutation.isPending || !summaryUrl}
    />
  );
}

export function OriginalLink({
  documentId,
  name,
  fileUrl,
}: {
  documentId: string;
  name: string;
  fileUrl?: string | null;
}) {
  const extension = name.split(".").pop();

  return (
    <DownloadLink
      icon={fileUrl ? ExternalLink : OctagonAlert}
      summaryUrl={fileUrl}
      label={`Original ${extension}`}
    />
  );
}

export function SummaryLink({
  documentId,
  summaryUrl,
  label = "Summary",
}: {
  label?: string;
  documentId: string;
  summaryUrl?: string | null;
}) {
  return (
    <DownloadLink
      icon={summaryUrl ? ExternalLink : OctagonAlert}
      summaryUrl={summaryUrl}
      label={label}
    />
  );
}

export function WebViewLink({
  documentId,
  name,
}: {
  documentId: string;
  name: string;
}) {
  return (
    <ActionButton
      icon={ExternalLink}
      label="Web View"
      href={`/doc/${documentId}/full`}
      target="_blank"
      rel="noopener noreferrer"
    />
  );
}

function formatPageRange(document: AdminFile) {
  if (document.relevantStartPage && document.relevantEndPage) {
    if (document.pageCount) {
      return `${document.relevantStartPage} - ${document.relevantEndPage} of ${document.pageCount}`;
    }
    return `${document.relevantStartPage} - ${document.relevantEndPage}`;
  }
  return "-";
}
