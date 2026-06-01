"use client";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { convertNewlines } from "@/components/utils";
import { useState } from "react";

const METADATA_KEYS = [
  { key: "caseNumber", title: "Case Number:" },
  { key: "caseTitle", title: "Case Title:" },
  { key: "depositionDate", title: "Deposition Date:" },
  { key: "deponent", title: "Deponent Name:" },
];

interface DocumentHeaderProps {
  fileName: string;
  metadata?: {
    caseNumber?: string | null;
    caseTitle?: string | null;
    depositionDate?: string | null;
    deponent?: string | null;
  } | null;
  abstract?: {
    abstract: string;
  } | null;
  isPrint?: boolean;
}

export function DocumentHeader({
  fileName,
  metadata,
  abstract,
  isPrint = false,
}: DocumentHeaderProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false); // Default collapsed on both mobile and desktop

  return (
    <>
      {/* Document Header - Large, Bold Title */}
      {isPrint ? (
        <div className="mb-2">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-foreground">
            {fileName}
          </h1>
        </div>
      ) : null}

      {/* Metadata Section - Collapsible or Static based on isPrint */}
      <div className="mb-2">
        {metadata && (
          <>
            {isPrint ? (
              // Original static layout for print/PDF generation
              <div className="space-y-2 bg-background p-2">
                {(() => {
                  const filteredKeys = METADATA_KEYS.filter(
                    (key) => metadata![key.key as keyof typeof metadata],
                  );

                  return (
                    <div className="space-y-1">
                      {filteredKeys.map((key, index) => (
                        <div key={index} className="flex">
                          <div className="w-48 shrink-0">
                            <span className="font-semibold text-muted-foreground">
                              {key.title}
                            </span>
                          </div>
                          <div className="flex-1">
                            <span className="text-foreground">
                              {
                                metadata![
                                  key.key as keyof typeof metadata
                                ] as string
                              }
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              // Collapsible layout for interactive views
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex w-full items-center justify-between p-2 text-left hover:bg-muted/50"
                  >
                    <span className="font-semibold text-foreground">
                      Case Details
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <div className="bg-background p-2">
                    {(() => {
                      const filteredKeys = METADATA_KEYS.filter(
                        (key) => metadata![key.key as keyof typeof metadata],
                      );

                      return (
                        <div className={isMobile ? "space-y-2" : "space-y-1"}>
                          {filteredKeys.map((key, index) => (
                            <div
                              key={index}
                              className={
                                isMobile ? "flex flex-col space-y-1" : "flex"
                              }
                            >
                              <div
                                className={
                                  isMobile
                                    ? "text-sm font-semibold text-muted-foreground"
                                    : "w-48 shrink-0"
                                }
                              >
                                <span className="font-semibold text-muted-foreground">
                                  {key.title}
                                </span>
                              </div>
                              <div
                                className={
                                  isMobile ? "text-foreground" : "flex-1"
                                }
                              >
                                <span className="text-foreground">
                                  {
                                    metadata![
                                      key.key as keyof typeof metadata
                                    ] as string
                                  }
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}

        {abstract?.abstract && (
          <div className="my-2">
            <Separator className="mb-4" />
            <div className="my-4">
              <h2 className="mb-2 text-2xl font-bold text-foreground">
                Abstract
              </h2>
              <div className="bg-background p-2">
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {convertNewlines(abstract.abstract)}
                </p>
              </div>
            </div>
            <Separator className="mt-4" />
          </div>
        )}
      </div>
    </>
  );
}
