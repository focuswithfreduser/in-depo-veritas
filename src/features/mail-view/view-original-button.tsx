"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";

export function ViewOriginalButton({
  fileUrl,
  fileName,
}: {
  fileUrl: string;
  fileName: string;
}) {
  const downloadMutation = api.document.getSignedPDFUrl.useMutation();
  const [isLoading, setIsLoading] = useState(false);

  const handleViewOriginal = () => {
    setIsLoading(true);
    downloadMutation.mutate(
      { url: fileUrl },
      {
        onSuccess: async (signedUrl) => {
          window.open(signedUrl, "_blank");
          setIsLoading(false);
        },
        onError: (error) => {
          console.error("Failed to get signed URL:", error);
          setIsLoading(false);
        },
      },
    );
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto w-20 flex-col px-1 py-1"
      onClick={handleViewOriginal}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mb-0.5 h-3 w-3 animate-spin" />
      ) : (
        <ExternalLink className="mb-0.5 h-3 w-3" />
      )}
      <span className="whitespace-normal break-words text-center text-[10px] leading-tight">
        View <br /> Original
      </span>
    </Button>
  );
}
