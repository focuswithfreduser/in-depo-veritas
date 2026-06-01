"use client";

import { Check, Copy } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function CopyToClipboard({
  children,
  text,
  className,
}: {
  children?: React.ReactNode;
  text?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const ref = React.useRef<HTMLDivElement>(null);

  const handleCopyToClipboard = async () => {
    const t = text ? text : ref.current?.innerText ?? "";
    await copy(t);
    toast(
      <>
        Copied <strong>{t} </strong> to clipboard
      </>,
    );
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <>
      <div className={cn("flex items-center space-x-0", className)}>
        {!text && (
          <div ref={ref} className="inline">
            {children}
          </div>
        )}
        <Button
          onClick={handleCopyToClipboard}
          variant="ghost"
          size="sm"
          className="ml-0"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </Button>
      </div>
    </>
  );
}

export async function copy(t: string) {
  try {
    await navigator.clipboard.writeText(t);
  } catch (error) {
    fallbackCopyTextToClipboard(t);
  }
}

function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
  }

  document.body.removeChild(textArea);
}
