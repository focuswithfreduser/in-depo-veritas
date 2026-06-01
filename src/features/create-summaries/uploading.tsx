"use client";

import { DocumentStatus } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { DocumentListRow } from "@/features/mail-view/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/trpc/react";
import { createId } from "@paralleldrive/cuid2";
import { CreditCard, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Dropzone from "react-dropzone";
import { toast } from "sonner";

export function Uploading() {
  const utils = api.useUtils();
  const isMobile = useIsMobile();

  const { data: usageData } = api.billing.usage.useQuery({ live: false });

  const getSignedUploadUrl = api.document.getSignedUploadUrl.useMutation();
  const createDocument = api.document.createFromSupabaseUrl.useMutation();

  const [uploading, setUploading] = useState(false);

  // Prevent navigation away while uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue =
          "You have uploads in progress. Are you sure you want to leave? Your uploads will be lost.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [uploading]);

  const handleFilesAccepted = async (acceptedFiles: File[]) => {
    setUploading(true);
    const filesWithIds = acceptedFiles.map((file) => ({
      file,
      id: createId(),
    }));
    const optimisticDocuments: DocumentListRow[] = filesWithIds.map(
      ({ file, id }) => ({
        id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        status: DocumentStatus.uploading,
        createdAt: new Date(),
        fileUrl: "",
        pageCount: null,
        summaryUrl: null,
        metadata: null,
        abstract: null,
      }),
    );
    utils.document.list.setData(undefined, (oldData) => {
      if (!oldData) return optimisticDocuments;
      return [...optimisticDocuments, ...oldData];
    });
    for (const { file, id } of filesWithIds) {
      try {
        // 1. Get signed upload URL from backend
        const { signedUrl, filePath } = await getSignedUploadUrl.mutateAsync({
          fileName: file.name,
          id,
        });
        // 2. Upload file directly to Supabase
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload to Supabase");
        // 3. Create document record in backend
        await createDocument.mutateAsync({
          id,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl: filePath,
        });
        utils.document.list.setData(undefined, (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((doc) =>
            doc.id === id
              ? {
                  ...doc,
                  status: DocumentStatus.pending,
                }
              : doc,
          );
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        utils.document.list.setData(undefined, (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((doc) =>
            doc.id === id ? { ...doc, status: DocumentStatus.failed } : doc,
          );
        });
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
  };

  const availableCount = useMemo(() => {
    if (!usageData) return 10;

    if (usageData.type === "freeForever") {
      return 10;
    }

    if (usageData.type === "trial") {
      const documentsLeft =
        Number(usageData.available) - Number(usageData.used);
      return Math.max(0, documentsLeft);
    }

    // For subscription type, allow unlimited uploads
    return 10;
  }, [usageData]);

  // Show trial-over interface when no uploads available
  if (usageData && availableCount === 0) {
    return (
      <div className="space-y-4">
        <div
          className={`rounded-lg border-2 border-dashed border-muted-foreground/25 text-center ${
            isMobile ? "p-4" : "p-8"
          }`}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <h3
                className={`font-medium ${isMobile ? "text-base" : "text-lg"}`}
              >
                Trial Limit Reached
              </h3>
              <p className="text-muted-foreground">
                You've used all your free uploads. Subscribe to continue
                uploading documents.
              </p>
              {!isMobile && (
                <p className="text-sm text-muted-foreground">
                  Supported formats: PDF, TXT, DOC, DOCX
                </p>
              )}
            </div>
            <Link href="/app/settings/billing">
              <Button className="gap-2">
                <CreditCard className="h-4 w-4" />
                Go to Billing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Dropzone
        disabled={uploading}
        onDrop={handleFilesAccepted}
        accept={{
          "application/pdf": [".pdf"],
          "text/plain": [".txt"],
          "application/msword": [".doc"],
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            [".docx"],
        }}
        multiple={availableCount > 1}
        maxFiles={availableCount}
      >
        {({ getRootProps, getInputProps, isDragActive, open }) => (
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed text-center transition-colors ${
              isMobile ? "p-4" : "p-8"
            } ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-primary">Drop the files here...</p>
            ) : isMobile ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Files
                </Button>
                <p className="text-sm text-muted-foreground">
                  PDF, TXT, DOC, DOCX
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Drag & drop documents here, or click below to select files
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: PDF, TXT, DOC, DOCX
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Add Files
                </Button>
              </div>
            )}
          </div>
        )}
      </Dropzone>
    </div>
  );
}
