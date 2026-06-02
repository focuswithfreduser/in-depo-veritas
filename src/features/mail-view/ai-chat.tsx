"use client";
import { useState, useEffect } from "react";
import { Send, Download, FileDown, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DocumentListRow } from "./types";
import { useChatStore, StoredChatMessage } from "@/stores/chat-store";
import {
  downloadChatAsMarkdown,
  downloadChatAsPdf,
  downloadChatAsText,
  filterVisibleMessages,
} from "./chat-actions";
import { ClearChatModal } from "./clear-chat-modal";
import { Markdown } from "@/components/markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/trpc/react";
import { type ChatMessage } from "@/features/chat/types";

// Helper function to convert StoredChatMessage back to UIMessage format
const convertToUIMessage = (storedMessage: StoredChatMessage): ChatMessage => ({
  role: storedMessage.role,
  content: storedMessage.content,
});

export function AIChat({
  selectedDocument,
}: {
  selectedDocument: DocumentListRow;
}) {
  const [input, setInput] = useState("");
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { saveChat, loadChat, clearChat } = useChatStore();
  const { data: me } = api.me.get.useQuery();

  // Load initial messages from store
  const storedMessages = loadChat(selectedDocument.id);
  const initialMessages = storedMessages.map(convertToUIMessage);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<"streaming" | "submitted" | null>(null);

  // Save messages to store whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveChat(selectedDocument.id, messages);
    }
  }, [messages, selectedDocument.id, saveChat]);

  const sendMessageMutation = api.chat.sendMessage_streaming.useMutation({
    async onSuccess(data) {
      setStatus("streaming");
      for await (const chunk of data) {
        const update = [...messages];
        update[update.length - 1].content += chunk;
        setMessages(update);
      }
      setStatus(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setInput("");
    setStatus("submitted");
    const update = [
      ...messages,
      {
        role: "user",
        content: input.trim(),
      } as ChatMessage,
      {
        role: "assistant",
        content: "",
      } as ChatMessage,
    ];
    setMessages(update);
    const payload = [...update];
    payload.pop();
    sendMessageMutation.mutate({
      messages: payload,
      metadata: { documentId: selectedDocument.id },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleClearChat = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = () => {
    // Clear from Zustand store
    clearChat(selectedDocument.id);
    // Clear from useChat hook
    setMessages([]);
  };

  const handleDownloadChat = () => {
    downloadChatAsText(messages, selectedDocument.fileName);
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await downloadChatAsPdf({
        messages,
        document: selectedDocument,
        exportedBy: me?.name || me?.email || "Unknown user",
      });
    } catch (err) {
      console.error("Failed to export chat PDF:", err);
      toast.error("Failed to export chat as PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportMarkdown = () => {
    try {
      downloadChatAsMarkdown({
        messages,
        document: selectedDocument,
        exportedBy: me?.name || me?.email || "Unknown user",
      });
    } catch (err) {
      console.error("Failed to export chat Markdown:", err);
      toast.error("Failed to export chat as Markdown");
    }
  };

  const visibleMessageCount = filterVisibleMessages(messages).length;

  return (
    <div className="flex h-full w-full flex-col bg-background px-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* Toolbar — clear + export PDF */}
        {messages.length > 0 ? (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              title="Clear chat"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear chat</span>
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportMarkdown}
                disabled={visibleMessageCount === 0}
                className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Export chat as Markdown"
              >
                <FileText className="h-3 w-3" />
                Export MD
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExportingPdf || visibleMessageCount === 0}
                className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Export chat as PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <FileDown className="h-3 w-3" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        ) : null}
        {/* Chat messages area - always present, scrollable */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 pb-2 pt-2">
            <div className="pt-0">
              {messages.map((message, idx) => (
                <div
                  key={`msg-container-${idx}`}
                  className={`mb-4 ${
                    message.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`inline-block max-w-[80%] rounded-lg px-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background"
                    }`}
                  >
                    {message.content.length ? (
                      <Markdown key={`msg-content-${idx}`}>
                        {message.content}
                      </Markdown>
                    ) : null}
                  </div>
                </div>
              ))}

              {/* Typing indicator when AI is thinking */}
              {status === "submitted" && (
                <div className="mb-4 text-left">
                  <div className="inline-block max-w-[80%] rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        {/* Chat input - always visible at the bottom */}
        <form onSubmit={handleSubmit} className="">
          <div className="relative flex items-end gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this document..."
              className="max-h-[120px] min-h-[44px] flex-1 resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={status === "submitted" || status === "streaming"}
            />
            <Button
              type="submit"
              disabled={
                !input.trim() ||
                status === "submitted" ||
                status === "streaming"
              }
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
            >
              {status === "submitted" || status === "streaming" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </form>
        {/* Helper text */}
        <div className="text-center text-xs text-muted-foreground">
          <div className="m-0">
            Press Enter to send, Shift+Enter for new line. Messages are saved
            locally.
          </div>
          {messages.length > 0 ? (
            <div className="m-0">
              To save the chat,{" "}
              <Button
                variant="link"
                size="sm"
                onClick={handleDownloadChat}
                className="h-auto p-0 text-xs text-muted-foreground underline hover:text-foreground"
              >
                <Download className="mr-1 h-3 w-3" />
                please download it now
              </Button>
              .
            </div>
          ) : null}
        </div>
      </div>
      {/* Clear Chat Modal */}
      <ClearChatModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirmClear={handleConfirmClear}
        messages={messages}
        documentFileName={selectedDocument.fileName}
      />
    </div>
  );
}
