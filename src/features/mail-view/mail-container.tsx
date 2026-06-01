"use client";

import { Search, Inbox, CheckCircle, Clock, FileText } from "lucide-react";
import Image from "next/image";

import { DocumentStatus } from "@/app/generated/prisma";
import { LoadingBlur } from "@/components/loading-blur";
import { Input } from "@/components/ui/input";
import { FilterButtonGroup } from "@/components/ui/filter-button-group";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/trpc/react";
import { fuzzySearchFields } from "@/utils/fuzzy-search";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { MailDisplay } from "./mail-display";
import { MailList } from "./mail-list";
import { MultiSelect } from "./multi-select";
import { Uploading } from "../create-summaries/uploading";
import { WelcomeBanner } from "./welcome-banner";
import { cn } from "@/lib/utils";

type FilterType = "all" | "complete" | "in-progress";

export function MailContainer() {
  const { data: documents, isLoading } = api.document.list.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 30, // 30 seconds
  });
  const isMobile = useIsMobile();
  const [selectedIds, setSelectedIds] = useQueryState(
    "selectedIds",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [shownPageId, setShownPageId] = useQueryState(
    "shownPageId",
    parseAsString.withDefault(""),
  );

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Calculate filter options with counts
  const filterOptions = useMemo(() => {
    if (!documents) {
      return [
        { value: "all" as const, label: "All", icon: Inbox, count: 0 },
        {
          value: "complete" as const,
          label: "Completed",
          icon: CheckCircle,
          count: 0,
        },
        {
          value: "in-progress" as const,
          label: "In Progress",
          icon: Clock,
          count: 0,
        },
      ];
    }

    const completeCount = documents.filter(
      (doc) => doc.status === DocumentStatus.complete,
    ).length;

    const inProgressCount = documents.filter(
      (doc) =>
        doc.status === DocumentStatus.uploading ||
        doc.status === DocumentStatus.pending ||
        doc.status === DocumentStatus.processing ||
        doc.status === DocumentStatus.finalizing,
    ).length;

    return [
      {
        value: "all" as const,
        label: "All",
        icon: Inbox,
        count: documents.length,
      },
      {
        value: "complete" as const,
        label: "Completed",
        icon: CheckCircle,
        count: completeCount,
      },
      {
        value: "in-progress" as const,
        label: "In Progress",
        icon: Clock,
        count: inProgressCount,
      },
    ];
  }, [documents]);

  // Filtered documents using useMemo for performance
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    let filtered = documents;

    // If searching, ignore status filters and search across all documents
    if (debouncedSearchTerm.trim()) {
      filtered = filtered
        .map((doc) => ({
          doc,
          score: fuzzySearchFields(debouncedSearchTerm, [
            doc.fileName,
            doc.metadata?.deponent,
          ]),
        }))
        .filter(({ score }) => score > 0.2) // Only include results with decent match
        .sort((a, b) => b.score - a.score) // Sort by relevance score
        .map(({ doc }) => doc);
    } else {
      // Only apply status filter when not searching
      if (filterType === "complete") {
        filtered = filtered.filter(
          (doc) => doc.status === DocumentStatus.complete,
        );
      } else if (filterType === "in-progress") {
        filtered = filtered.filter(
          (doc) =>
            doc.status === DocumentStatus.uploading ||
            doc.status === DocumentStatus.pending ||
            doc.status === DocumentStatus.processing ||
            doc.status === DocumentStatus.finalizing,
        );
      }
    }

    return filtered;
  }, [documents, filterType, debouncedSearchTerm]);

  const selectedDocument = useMemo(() => {
    if (shownPageId) {
      return filteredDocuments?.find((document) => document.id === shownPageId);
    }
    return null;
  }, [filteredDocuments, shownPageId]);

  const toggleSelected = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectSingle = (id: string) => {
    setShownPageId(id);
  };

  const clearAllSelections = () => {
    setSelectedIds([]);
  };

  const closeDeposition = () => {
    setShownPageId("");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Mail List */}
      <div
        className={`flex flex-shrink-0 flex-col border-r ${
          isMobile ? (shownPageId ? "hidden" : "w-full") : "w-2/5"
        }`}
      >
        <div className={cn("flex flex-col gap-2", isMobile ? "m-1" : "m-2")}>
          <WelcomeBanner />
          <Uploading />
        </div>
        <div
          className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${
            isMobile ? "p-2" : "p-4"
          }`}
        >
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search depositions..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // Reset filter to "all" when user starts typing
                if (e.target.value.trim() && filterType !== "all") {
                  setFilterType("all");
                }
              }}
            />
          </div>
        </div>
        <div
          className={`flex items-center border-b py-2 ${
            isMobile ? "px-2" : "px-4"
          }`}
        >
          <FilterButtonGroup
            options={filterOptions}
            value={filterType}
            onChange={setFilterType}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <LoadingBlur
            loading={isLoading}
            fullScreen={false}
            showCenter={true}
            centerText="Just a moment..."
          />
          {!isLoading && filteredDocuments && filteredDocuments.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-lg">
                  {documents && documents.length === 0
                    ? "Get started by uploading a deposition above"
                    : "No depositions match your current filters"}
                </p>
              </div>
            </div>
          ) : (
            filteredDocuments && (
              <MailList
                documents={filteredDocuments}
                selectedIds={selectedIds}
                shownPageId={shownPageId}
                onToggleSelected={toggleSelected}
                onSelectSingle={selectSingle}
              />
            )
          )}
        </div>
      </div>
      <div
        className={`overflow-hidden ${
          isMobile ? (shownPageId ? "w-full" : "hidden") : "flex-1"
        }`}
      >
        {selectedDocument ? (
          <div className="flex h-full flex-col overflow-hidden">
            <MailDisplay
              selectedDocument={selectedDocument}
              onClose={closeDeposition}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex items-center justify-center rounded-full bg-muted/50 p-6">
                <Image
                  src="/logo.png"
                  alt="InDepoVeritas Logo"
                  width={48}
                  height={48}
                  className="h-12 w-12 opacity-60"
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  Welcome to your depositions
                </h3>
                <p className="max-w-sm text-muted-foreground">
                  {documents && documents.length > 0
                    ? "Select a deposition from the list to view its contents, summaries, and analysis"
                    : "Upload your first deposition to get started with AI-powered summaries"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>
                  {documents && documents.length > 0
                    ? "Click on any deposition to get started"
                    : "Upload a deposition to get started"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MultiSelect
        selectedIds={selectedIds}
        onClearAllSelections={clearAllSelections}
      />
    </div>
  );
}
