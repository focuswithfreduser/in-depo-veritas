"use client";

import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
  target?: string;
  rel?: string;
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  href,
  target,
  rel,
}: ActionButtonProps) {
  const buttonContent = (
    <>
      <Icon className="mb-0.5 h-3 w-3" />
      <span className="whitespace-normal break-words text-center text-[10px] leading-tight">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto w-20 flex-col px-1 py-1"
        disabled={disabled}
        asChild
      >
        <Link href={href} target={target} rel={rel}>
          {buttonContent}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto w-20 flex-col px-1 py-1"
      onClick={onClick}
      disabled={disabled}
    >
      {buttonContent}
    </Button>
  );
}
