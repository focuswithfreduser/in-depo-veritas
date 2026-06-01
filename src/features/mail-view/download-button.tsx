"use client";

import { DocumentStatus } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { downloadFileFromUrl } from "@/utils/download-file";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

export function DownloadButton({
  summaryUrl,
  fileName,
  asTab,
}: {
  summaryUrl: string;
  fileName: string;
  asTab?: boolean;
}) {
  const downloadMutation = api.document.getSignedPDFUrl.useMutation();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    downloadMutation.mutate(
      { url: summaryUrl },
      {
        onSuccess: async (signedUrl) => {
          const filename = `${fileName ? `${fileName}-` : ""}summary.pdf`;
          if (asTab) {
            window.open(signedUrl, "_blank");
          } else {
            await downloadFileFromUrl(signedUrl, filename);
          }
          setIsDownloading(false);
        },
        onError: (error) => {
          console.error("Failed to get signed URL:", error);
          setIsDownloading(false);
        },
      },
    );
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto w-20 flex-col px-1 py-1"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2 className="mb-0.5 h-3 w-3 animate-spin" />
      ) : asTab ? (
        <ExternalLink className="mb-0.5 h-3 w-3" />
      ) : (
        <Download className="mb-0.5 h-3 w-3" />
      )}
      <span className="whitespace-normal break-words text-center text-[10px] leading-tight">
        {asTab ? (
          <span>
            View <br /> Summary PDF
          </span>
        ) : (
          "Download Summary PDF"
        )}
      </span>
    </Button>
  );
}
