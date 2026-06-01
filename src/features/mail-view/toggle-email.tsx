"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function ToggleEmail() {
  const [emailWhenComplete, setEmailWhenComplete] = useState(false);

  return (
    <div className="ml-4 flex items-center space-x-2">
      <Switch
        id="email-when-complete"
        checked={emailWhenComplete}
        onCheckedChange={setEmailWhenComplete}
      />
      <Label
        htmlFor="email-when-complete"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Email when complete
      </Label>
    </div>
  );
}
