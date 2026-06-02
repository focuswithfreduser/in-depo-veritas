import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type ChatPdfMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatPdfMetadata = {
  fileName: string;
  documentCreatedAt: Date;
  deponent: string | null;
  caseNumber: string | null;
  caseTitle: string | null;
  depositionDate: string | null;
  depositionLocation: string | null;
};

export type ChatPdfData = {
  appName: string;
  disclaimer: string;
  metadata: ChatPdfMetadata;
  messages: ChatPdfMessage[];
  exportedBy: string;
  exportedAt: Date;
};

const colors = {
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  userBg: "#EEF2FF",
  userBorder: "#C7D2FE",
  assistantBg: "#FFFFFF",
  brand: "#1F2937",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.text,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.brand,
  },
  brandSub: {
    fontSize: 9,
    color: colors.muted,
  },
  disclaimer: {
    marginTop: 6,
    fontSize: 8,
    color: colors.muted,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 6,
    color: colors.brand,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  metaCell: {
    width: "50%",
    paddingRight: 8,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 10,
    color: colors.text,
  },
  messageBlock: {
    marginBottom: 10,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  userBlock: {
    backgroundColor: colors.userBg,
    borderColor: colors.userBorder,
  },
  assistantBlock: {
    backgroundColor: colors.assistantBg,
    borderColor: colors.border,
  },
  messageRole: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    color: colors.brand,
  },
  messageContent: {
    fontSize: 10,
    color: colors.text,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.muted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  emptyNote: {
    fontStyle: "italic",
    color: colors.muted,
  },
});

const formatDateTime = (d: Date): string =>
  `${d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} ${d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

const formatDate = (d: Date): string =>
  d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function MetaCell({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value && value.length ? value : "—"}</Text>
    </View>
  );
}

export function ChatExportDocument({ data }: { data: ChatPdfData }) {
  const { appName, disclaimer, metadata, messages, exportedBy, exportedAt } =
    data;

  return (
    <Document
      title={`${metadata.fileName} — Chat transcript`}
      author={exportedBy}
      creator={appName}
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{appName}</Text>
            <Text style={styles.brandSub}>AI Chat Transcript</Text>
          </View>
          <Text style={styles.disclaimer}>{disclaimer}</Text>
        </View>

        {/* Metadata */}
        <Text style={styles.sectionTitle}>Document</Text>
        <View style={styles.metaGrid}>
          <MetaCell label="File name" value={metadata.fileName} />
          <MetaCell
            label="Document date"
            value={formatDate(metadata.documentCreatedAt)}
          />
          <MetaCell label="Deponent" value={metadata.deponent} />
          <MetaCell label="Case number" value={metadata.caseNumber} />
          <MetaCell label="Case title" value={metadata.caseTitle} />
          <MetaCell
            label="Deposition date"
            value={metadata.depositionDate}
          />
          <MetaCell
            label="Deposition location"
            value={metadata.depositionLocation}
          />
        </View>

        {/* Transcript */}
        <Text style={styles.sectionTitle}>Conversation</Text>
        {messages.length === 0 ? (
          <Text style={styles.emptyNote}>No messages in this conversation.</Text>
        ) : (
          messages.map((message, idx) => {
            const isUser = message.role === "user";
            return (
              <View
                key={idx}
                style={[
                  styles.messageBlock,
                  isUser ? styles.userBlock : styles.assistantBlock,
                ]}
                wrap
              >
                <Text style={styles.messageRole}>
                  {isUser ? "You" : "In Depo Veritas AI"}
                </Text>
                <Text style={styles.messageContent}>{message.content}</Text>
              </View>
            );
          })
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Exported by {exportedBy} on {formatDateTime(exportedAt)}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
