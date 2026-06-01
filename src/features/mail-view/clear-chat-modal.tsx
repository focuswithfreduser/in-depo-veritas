"use client";

import { ChatMessage } from "@/features/chat/types";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadChatAsText, filterVisibleMessages } from "./chat-actions";

interface ClearChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
  messages: ChatMessage[];
  documentFileName: string;
}

export function ClearChatModal({
  isOpen,
  onClose,
  onConfirmClear,
  messages,
  documentFileName,
}: ClearChatModalProps) {
  const visibleMessages = filterVisibleMessages(messages);
  const hasMessages = visibleMessages.length > 0;

  const handleDownload = () => {
    downloadChatAsText(messages, documentFileName);
  };

  const handleClear = () => {
    onConfirmClear();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear Chat</DialogTitle>
          <DialogDescription>
            Are you sure you want to clear this chat? This action cannot be
            undone.
            {hasMessages && " You can save the chat before clearing it."}
          </DialogDescription>
        </DialogHeader>

        {hasMessages && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              This chat contains {visibleMessages.length} message
              {visibleMessages.length !== 1 ? "s" : ""}.
            </p>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Save Chat as Text File
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleClear}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
