import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

import { DocumentStatus } from "@/app/generated/prisma";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CancelButton } from "./cancel-button";
import { DocumentListRow } from "./types";

interface MailListProps {
  documents: DocumentListRow[];
  selectedIds: string[];
  shownPageId: string;
  onToggleSelected: (id: string) => void;
  onSelectSingle: (id: string) => void;
}

export function MailList({
  documents,
  selectedIds,
  shownPageId,
  onToggleSelected,
  onSelectSingle,
}: MailListProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-2 pt-2 md:p-4">
        {documents.map((document) => (
          <div
            key={document.id}
            className={cn(
              "flex flex-row items-start rounded-lg border",
              shownPageId === document.id
                ? "bg-muted-foreground/50"
                : "hover:bg-accent/20",
            )}
          >
            <div className="flex flex-col items-center justify-between gap-2 p-1 md:p-3">
              {document.status === DocumentStatus.complete ? (
                <div className="flex h-6 w-6 items-center justify-center md:h-10 md:w-10">
                  <Checkbox
                    className="h-4 w-4 md:h-6 md:w-6"
                    checked={selectedIds.includes(document.id)}
                    onCheckedChange={() => onToggleSelected(document.id)}
                  />
                </div>
              ) : (
                <CancelButton
                  documentId={document.id}
                  fileName={document.fileName}
                />
              )}
            </div>
            <button
              className="flex flex-1 flex-col items-start gap-2 rounded-lg p-2 text-left text-sm transition-all md:p-3"
              onClick={() => onSelectSingle(document.id)}
            >
              <div className="flex w-full flex-col gap-1">
                <div className="flex items-center">
                  <div className="flex items-center gap-2">
                    {document.status === DocumentStatus.failed ? (
                      <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    ) : document.status === DocumentStatus.processing ? (
                      <span className="flex h-2 w-2 animate-pulse rounded-full bg-orange-300" />
                    ) : document.status === DocumentStatus.finalizing ? (
                      <span className="flex h-2 w-2 animate-pulse rounded-full bg-orange-300" />
                    ) : document.status === DocumentStatus.uploading ? (
                      <span className="flex h-2 w-2 animate-pulse rounded-full bg-black" />
                    ) : document.status === DocumentStatus.pending ? (
                      <span className="flex h-2 w-2 animate-pulse rounded-full bg-orange-300" />
                    ) : null}
                    <div className="font-semibold">
                      {document.metadata?.deponent
                        ? document.metadata?.deponent
                        : document.fileName}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "ml-auto text-xs",
                      shownPageId === document.id
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatDistanceToNow(new Date(document.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                {document.metadata?.deponent && (
                  <div className="text-xs font-medium">{document.fileName}</div>
                )}
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground">
                {document.abstract
                  ? document.abstract.abstract.substring(0, 300)
                  : document.status === DocumentStatus.failed
                  ? "Failed to summarize. Please try again."
                  : "Summary in progress..."}
              </div>
            </button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
