import { DocumentGet } from "@/features/admin/types";
import { DocumentContent } from "@/features/shared/document-content";
import { DocumentHeader } from "@/features/shared/document-header";
import "@/styles/print.css";

export function WebView({
  document,
  isFull,
  isPrint = false,
}: {
  document: DocumentGet;
  isFull: boolean;
  isPrint?: boolean;
}) {
  return (
    <div
      className="mx-auto max-w-4xl px-8 pt-8"
      style={{ scrollBehavior: "smooth" }}
    >
      <DocumentHeader
        fileName={document.fileName}
        metadata={document.metadata}
        abstract={document.abstract}
        isPrint={isPrint}
      />

      <DocumentContent
        summaryChunks={document.summaryChunks}
        pages={document.pages}
        isFull={isFull}
      />
    </div>
  );
}
