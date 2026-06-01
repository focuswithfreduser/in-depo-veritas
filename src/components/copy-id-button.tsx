"use client";

import { Check, Copy } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface CopyIdButtonProps {
  id: string;
  label?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function CopyIdButton({
  id,
  label = "Copy ID",
  variant = "ghost",
  size = "sm",
  className,
  showLabel = false,
}: CopyIdButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success(`Copied ${label} to clipboard`);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      toast.success(`Copied ID to clipboard`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buttonContent = (
    <Button
      onClick={handleCopy}
      variant={variant}
      size={size as "default" | "sm" | "lg" | "icon" | null | undefined}
      className={cn(
        "transition-all duration-200",
        copied && "text-green-600 dark:text-green-400",
        showLabel ? "gap-2" : "h-8 w-8 p-0",
        className,
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {showLabel && <span>{copied ? "Copied!" : label}</span>}
    </Button>
  );

  if (showLabel) {
    return buttonContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
