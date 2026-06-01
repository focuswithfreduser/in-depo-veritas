"use client";
import { format } from "date-fns/format";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/trpc/react";
import { formatDistanceToNow, addMonths } from "date-fns";
import { ChevronLeft, Loader2, X, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DocumentContent } from "../shared/document-content";
import { DocumentHeader } from "../shared/document-header";
import { ArchiveButton } from "./archive-button";
import { DownloadButton } from "./download-button";
import { DocumentListRow } from "./types";
import { ViewOriginalButton } from "./view-original-button";
import { AIChat } from "./ai-chat";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

// Helper function to determine if document processing is in progress
function isDocumentInProgress(selectedDocument: DocumentListRow) {
  // If there's no summaryUrl, it's definitely in progress
  return !selectedDocument.summaryUrl;
}

function InProgressWarning() {
  return (
    <div className="bg-yellow/10 p-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Summary In Progress</span>
        <span className="text-xs text-muted-foreground">
          - Download link will appear when complete
        </span>
      </div>
    </div>
  );
}

export function MailDisplay({
  selectedDocument,
  onClose,
}: {
  selectedDocument: DocumentListRow;
  onClose?: () => void;
}) {
  const isMobile = useIsMobile();
  const deponent = selectedDocument?.metadata?.deponent;
  const caseNumber = selectedDocument?.metadata?.caseNumber;
  const { data: document } = api.document.get.useQuery(
    {
      id: selectedDocument.id,
    },
    {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  );

  return (
    <div
      className={`relative flex h-full flex-col gap-2 pt-0 ${
        isMobile ? "px-1 py-2" : "p-4"
      }`}
    >
      {/* Mobile Back Button */}
      {isMobile && onClose && (
        <div className="mb-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex items-center gap-2 p-3 text-left hover:bg-muted/50"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </Button>
        </div>
      )}

      <div
        className={`flex items-start justify-between ${
          isMobile ? "p-1" : "p-2"
        }`}
      >
        <div className="flex items-center gap-2">
          {selectedDocument?.summaryUrl && (
            <>
              <DownloadButton
                summaryUrl={selectedDocument?.summaryUrl}
                fileName={selectedDocument?.fileName}
                asTab={false}
              />
              <DownloadButton
                summaryUrl={selectedDocument?.summaryUrl}
                fileName={selectedDocument?.fileName}
                asTab
              />
            </>
          )}
          <Separator orientation="vertical" className="mx-1 h-6" />
          {selectedDocument?.fileUrl && (
            <ViewOriginalButton
              fileUrl={selectedDocument.fileUrl}
              fileName={selectedDocument.fileName}
            />
          )}
          <ArchiveButton
            documentId={selectedDocument?.id}
            fileName={selectedDocument?.fileName}
          />
        </div>
        {onClose && !isMobile && (
          <Button
            variant="ghost"
            size="default"
            onClick={onClose}
            className="h-9 w-9 p-0"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close deposition</span>
          </Button>
        )}
      </div>
      <Separator />
      <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
        <ResizablePanel
          defaultSize={70}
          minSize={30}
          maxSize={90}
          className="min-h-[200px]"
        >
          <div className="flex h-full flex-col pb-0">
            <div
              className={`flex items-start ${isMobile ? "px-1 py-2" : "p-4"}`}
            >
              <div className="flex items-start gap-4 text-sm">
                {deponent && (
                  <Avatar>
                    <AvatarImage alt={selectedDocument.fileName} />
                    <AvatarFallback>
                      {deponent
                        ?.split(" ")
                        .map((chunk) => chunk[0])
                        .slice(0, 3)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="grid gap-1">
                  <div className="text-xl font-semibold">
                    {deponent ? deponent : selectedDocument.fileName}
                  </div>
                  {deponent && (
                    <div className="line-clamp-1 text-xs">
                      <span className="font-medium">File name:</span>{" "}
                      {selectedDocument.fileName}
                    </div>
                  )}
                  {caseNumber && (
                    <div className="line-clamp-1 text-xs">
                      <span className="font-medium">Case number:</span>{" "}
                      {caseNumber}
                    </div>
                  )}
                </div>
              </div>
              {selectedDocument.createdAt && (
                <div className="ml-auto text-xs text-muted-foreground">
                  {format(new Date(selectedDocument.createdAt), "PPpp")}
                  <br />
                  {formatDistanceToNow(new Date(selectedDocument.createdAt), {
                    addSuffix: true,
                  })}
                  <br />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-xs text-muted-foreground/80 underline decoration-dotted">
                          Scheduled deletion:{" "}
                          {format(
                            addMonths(new Date(selectedDocument.createdAt), 2),
                            "PPP",
                          )}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          We automatically delete files every 2 months. Please
                          download your summaries as PDF to ensure you don't
                          lose them.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            {/* Show in-progress warning after the deponent/filename section */}
            {isDocumentInProgress(selectedDocument) && <InProgressWarning />}
            <Separator />
            <ScrollArea className="h-full">
              <div className={isMobile ? "px-1 py-2" : "p-8"}>
                <DocumentHeader
                  fileName={selectedDocument.fileName}
                  metadata={selectedDocument.metadata}
                  abstract={selectedDocument.abstract}
                />
                {document ? (
                  <DocumentContent
                    summaryChunks={document?.summaryChunks}
                    pages={document?.pages}
                    isFull
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                    <span className="text-sm">Loading full summary...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          defaultSize={30}
          minSize={10}
          maxSize={70}
          className="min-h-[120px]"
        >
          <AIChat selectedDocument={selectedDocument} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
