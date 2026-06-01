import { ReactNode } from "react";

interface HelpBoxProps {
  children: ReactNode;
}

export function HelpBox({ children }: HelpBoxProps) {
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <div className="space-y-2 text-sm text-foreground">{children}</div>
    </div>
  );
}
