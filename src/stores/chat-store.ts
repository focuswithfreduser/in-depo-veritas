import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChatMessage } from "@/features/chat/types";
import { createId } from "@paralleldrive/cuid2";

// Type for a stored chat message (simplified version of UIMessage)
export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

// Type for a stored chat session
export interface StoredChat {
  documentId: string;
  messages: StoredChatMessage[];
  lastUpdated: number;
}

interface ChatStore {
  // Map of documentId to stored chat
  chats: Record<string, StoredChat>;

  // Actions
  saveChat: (documentId: string, messages: ChatMessage[]) => void;
  loadChat: (documentId: string) => StoredChatMessage[];
  clearChat: (documentId: string) => void;
  clearAllChats: () => void;
}

// Helper function to convert UIMessage to StoredChatMessage
const convertToStoredMessage = (message: ChatMessage): StoredChatMessage => {
  return {
    id: createId(),
    role: message.role,
    content: message.content,
    timestamp: Date.now(),
  };
};

// Helper function to filter out the first message if it's likely the document content
const filterMessages = (messages: ChatMessage[]): ChatMessage[] => {
  if (messages.length === 0) return [];

  // Skip the first message if it's from assistant and very long (likely document content)
  const firstMessage = messages[0];
  if (
    firstMessage?.role === "assistant" &&
    firstMessage?.content.length > 1000
  ) {
    return messages.slice(1);
  }

  return messages;
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: {},

      saveChat: (documentId: string, messages: ChatMessage[]) => {
        const filteredMessages = filterMessages(messages);

        if (filteredMessages.length === 0) {
          // If no messages to save, remove the chat
          set((state) => {
            const newChats = { ...state.chats };
            delete newChats[documentId];
            return { chats: newChats };
          });
          return;
        }

        const storedMessages = filteredMessages.map(convertToStoredMessage);

        set((state) => ({
          chats: {
            ...state.chats,
            [documentId]: {
              documentId,
              messages: storedMessages,
              lastUpdated: Date.now(),
            },
          },
        }));
      },

      loadChat: (documentId: string): StoredChatMessage[] => {
        const chat = get().chats[documentId];
        return chat?.messages || [];
      },

      clearChat: (documentId: string) => {
        set((state) => {
          const newChats = { ...state.chats };
          delete newChats[documentId];
          return { chats: newChats };
        });
      },

      clearAllChats: () => {
        set({ chats: {} });
      },
    }),
    {
      name: "indepoveritas-chat-storage",
      // Only persist the chats, not any temporary state
      partialize: (state) => ({ chats: state.chats }),
    },
  ),
);
