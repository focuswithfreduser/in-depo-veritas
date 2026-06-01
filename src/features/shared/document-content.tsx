import { convertNewlines } from "@/components/utils";
import Link from "next/link";
import { useMemo } from "react";

interface DocumentContentProps {
  summaryChunks?: {
    id: string;
    isRelevant?: boolean | null;
    summary?: string | null;
    startPage: number;
    endPage: number;
  }[];
  pages?: string[];
  isFull: boolean;
}

export function DocumentContent({
  summaryChunks,
  pages,
  isFull,
}: DocumentContentProps) {
  // Create a lookup that maps page numbers to chunk indices
  const pageToChunkIndex = useMemo(() => {
    const lookup: Record<number, string> = {};
    summaryChunks?.forEach((chunk, index) => {
      // For each page in this chunk's range, map it to the chunk index
      for (let page = chunk.startPage; page <= chunk.endPage; page++) {
        lookup[page] = `${index + 1}`;
      }
    });
    return lookup;
  }, [summaryChunks]);

  return (
    <>
      {/* Summaries Section */}
      <div className="mt-4">
        {summaryChunks?.map((chunk, index) => {
          if (chunk.isRelevant === false) {
            return <div key={chunk.id} />;
          }
          return (
            <div key={chunk.id} className="my-4 mt-8">
              <div
                className="mb-2 text-xl font-bold text-foreground"
                id={`summary-${index + 1}`}
              >
                Section {index + 1}
              </div>
              {chunk.summary ? (
                isFull ? (
                  <div className="space-y-2">
                    <div className="bg-background p-2">
                      <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                        {convertNewlines(chunk.summary)}
                      </div>
                    </div>
                    {pages && pages[chunk.startPage] && (
                      <JumpLink href={`#raw-${chunk.startPage}`}>
                        See in transcript
                      </JumpLink>
                    )}
                  </div>
                ) : (
                  <div className="bg-background p-2">
                    <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                      {convertNewlines(chunk.summary)}
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-background p-2" />
              )}
            </div>
          );
        })}
      </div>

      {isFull && (
        <div className="content print:break-before-page">
          {pages?.map((page, index) => {
            return (
              <div
                id={`raw-${index + 1}`}
                key={`raw-${index}`}
                className="whitespace-pre-wrap text-xs"
              >
                {index > 0 && pageToChunkIndex[index + 1] !== undefined && (
                  <JumpLink href={`#summary-${pageToChunkIndex[index + 1]}`}>
                    Back to Summary
                  </JumpLink>
                )}
                {page}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function JumpLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-4 my-4">
      <Link
        href={href}
        className="ml-2 text-black underline hover:text-primary"
      >
        {children}
      </Link>
    </div>
  );
}
