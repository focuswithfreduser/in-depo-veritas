import { ChatMessage } from "@/features/chat/types";

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

// Function to download chat as text file
export const downloadChatAsText = (
  messages: ChatMessage[],
  fileName: string,
) => {
  const visibleMessages = filterVisibleMessages(messages);

  if (visibleMessages.length === 0) return;

  // Format messages as text
  const chatText = visibleMessages
    .map((message) => {
      const role = message.role === "user" ? "You" : "AI";
      return `${role}: ${message.content}`;
    })
    .join("\n\n");

  // Create and download the file
  const blob = new Blob([chatText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  // Use document fileName for the download filename, removing extension and adding "chat"
  const baseFileName = fileName.replace(/\.[^/.]+$/, "");
  link.download = `${baseFileName}-chat.txt`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
