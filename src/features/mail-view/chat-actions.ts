import { ChatMessage } from "@/features/chat/types";
import type { DocumentListRow } from "./types";
import {
  ChatExportDocument,
  type ChatPdfData,
} from "./chat-export-pdf";

const APP_NAME = "In Depo Veritas";
const DISCLAIMER =
  "AI-generated transcript. This is not legal advice. Verify all content against source materials before relying on it.";

// Helper function to filter out the first message if it's likely the document content
export const filterVisibleMessages = (
  messages: ChatMessage[],
): ChatMessage[] => {
  if (messages.length === 0) return [];

  // Skip the first message if it's from assistant and very long (likely the document content)
  const firstMessage = messages[0];
  if (
    firstMessage?.role === "assistant" &&
    firstMessage?.content.length > 1000
  ) {
    return messages.slice(1);
  }

  return messages;
};

const triggerBrowserDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const stripExtension = (fileName: string): string =>
  fileName.replace(/\.[^/.]+$/, "");

// Pure formatter — testable independently of the DOM download bits.
export const formatChatAsText = (messages: ChatMessage[]): string =>
  filterVisibleMessages(messages)
    .map((message) => {
      const role = message.role === "user" ? "You" : "AI";
      return `${role}: ${message.content}`;
    })
    .join("\n\n");

// Function to download chat as text file
export const downloadChatAsText = (
  messages: ChatMessage[],
  fileName: string,
) => {
  const chatText = formatChatAsText(messages);
  if (chatText.length === 0) return;

  const blob = new Blob([chatText], { type: "text/plain" });
  triggerBrowserDownload(blob, `${stripExtension(fileName)}-chat.txt`);
};

// Pure builder: transforms the raw chat + document into the data shape the
// PDF component consumes. Kept side-effect-free so it's unit-testable
// independently of @react-pdf/renderer.
export const buildChatPdfData = (input: {
  messages: ChatMessage[];
  document: Pick<DocumentListRow, "fileName" | "createdAt" | "metadata">;
  exportedBy: string;
  now?: Date;
}): ChatPdfData => {
  const visibleMessages = filterVisibleMessages(input.messages);

  return {
    appName: APP_NAME,
    disclaimer: DISCLAIMER,
    metadata: {
      fileName: input.document.fileName,
      documentCreatedAt: input.document.createdAt,
      deponent: input.document.metadata?.deponent ?? null,
      caseNumber: input.document.metadata?.caseNumber ?? null,
      caseTitle: input.document.metadata?.caseTitle ?? null,
      depositionDate: input.document.metadata?.depositionDate ?? null,
      depositionLocation: input.document.metadata?.depositionLocation ?? null,
    },
    messages: visibleMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    exportedBy: input.exportedBy,
    exportedAt: input.now ?? new Date(),
  };
};

// Function to download chat as PDF file (client-side, @react-pdf/renderer).
export const downloadChatAsPdf = async (input: {
  messages: ChatMessage[];
  document: Pick<DocumentListRow, "fileName" | "createdAt" | "metadata">;
  exportedBy: string;
}): Promise<void> => {
  const data = buildChatPdfData(input);
  if (data.messages.length === 0) return;

  // Dynamic import keeps @react-pdf/renderer out of the initial bundle.
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(ChatExportDocument({ data })).toBlob();

  triggerBrowserDownload(
    blob,
    `${stripExtension(input.document.fileName)}-chat.pdf`,
  );
};

const formatExportedAt = (d: Date): string =>
  `${d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} ${d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

// Pure formatter — same metadata as the PDF, rendered as Markdown.
// Sections: title + metadata block + transcript with **You:** / **AI:** labels.
// Returns "" when there is nothing visible to export (parallels formatChatAsText).
export const formatChatAsMarkdown = (input: {
  messages: ChatMessage[];
  document: Pick<DocumentListRow, "fileName" | "createdAt" | "metadata">;
  exportedBy: string;
  now?: Date;
}): string => {
  const visible = filterVisibleMessages(input.messages);
  if (visible.length === 0) return "";

  const md = input.document.metadata;
  const lines: string[] = [];

  lines.push(`# Chat transcript — ${input.document.fileName}`);
  lines.push("");
  lines.push(`_${DISCLAIMER}_`);
  lines.push("");

  // Metadata as a definition-style list. We render a row only when the value
  // is present, so a document with no SummaryMetadata still produces a clean
  // header with the file name and dates.
  lines.push("## Document");
  lines.push("");
  const metaRows: Array<[string, string | null | undefined]> = [
    ["File name", input.document.fileName],
    [
      "Document date",
      input.document.createdAt.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    ],
    ["Deponent", md?.deponent],
    ["Case number", md?.caseNumber],
    ["Case title", md?.caseTitle],
    ["Deposition date", md?.depositionDate],
    ["Deposition location", md?.depositionLocation],
  ];
  for (const [label, value] of metaRows) {
    if (value && value.length) {
      lines.push(`- **${label}:** ${value}`);
    }
  }

  lines.push("");
  lines.push("## Conversation");
  lines.push("");

  for (const m of visible) {
    const label = m.role === "user" ? "**You:**" : "**In Depo Veritas AI:**";
    lines.push(label);
    lines.push("");
    lines.push(m.content);
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    `_Exported by ${input.exportedBy} on ${formatExportedAt(
      input.now ?? new Date(),
    )}_`,
  );

  return lines.join("\n");
};

// Function to download chat as Markdown file.
export const downloadChatAsMarkdown = (input: {
  messages: ChatMessage[];
  document: Pick<DocumentListRow, "fileName" | "createdAt" | "metadata">;
  exportedBy: string;
}): void => {
  const content = formatChatAsMarkdown(input);
  if (content.length === 0) return;

  const blob = new Blob([content], { type: "text/markdown" });
  triggerBrowserDownload(
    blob,
    `${stripExtension(input.document.fileName)}-chat.md`,
  );
};
