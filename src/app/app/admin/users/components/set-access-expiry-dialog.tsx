"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface SetAccessExpiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentAccessExpiresAt: Date | null;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function SetAccessExpiryDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentAccessExpiresAt,
}: SetAccessExpiryDialogProps) {
  const utils = api.useUtils();
  const [date, setDate] = React.useState<Date | undefined>(
    currentAccessExpiresAt ?? undefined,
  );
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDate(currentAccessExpiresAt ?? undefined);
    }
  }, [open, currentAccessExpiresAt]);

  const mutation = api.admin.setUserAccessExpiry.useMutation({
    onSuccess: (data) => {
      if (data.accessExpiresAt) {
        toast.success(
          `${userName} has access until ${format(data.accessExpiresAt, "PPP")}`,
        );
      } else {
        toast.success(`${userName} now has unlimited access`);
      }
      onOpenChange(false);
      utils.admin.listUsersWithOrganizations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update access expiry");
    },
  });

  const handleSave = () => {
    if (!date) {
      toast.error("Pick a date or use Remove Limit");
      return;
    }
    mutation.mutate({ userId, expiresAt: endOfDay(date) });
  };

  const handleClear = () => {
    mutation.mutate({ userId, expiresAt: null });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasActiveGrant =
    currentAccessExpiresAt !== null &&
    currentAccessExpiresAt.getTime() > Date.now();
  const hasExpiredGrant =
    currentAccessExpiresAt !== null &&
    currentAccessExpiresAt.getTime() <= Date.now();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Set Access Expiry</DialogTitle>
          <DialogDescription>
            Grant <strong>{userName}</strong> time-limited access. They keep
            access UNTIL the chosen date, then lose it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasActiveGrant && currentAccessExpiresAt && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
              Access currently expires on{" "}
              <strong>{format(currentAccessExpiresAt, "PPP")}</strong>.
            </div>
          )}

          {hasExpiredGrant && currentAccessExpiresAt && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
              Access expired on{" "}
              <strong>{format(currentAccessExpiresAt, "PPP")}</strong>. User
              cannot sign in until you extend or remove the limit.
            </div>
          )}

          <div className="space-y-2">
            <Label>Access expires on</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setPopoverOpen(false);
                  }}
                  disabled={(d) => d < today}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              User has access until end of day on this date.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {currentAccessExpiresAt && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                disabled={mutation.isPending}
              >
                Remove Limit
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={mutation.isPending || !date}
            >
              {mutation.isPending ? "Saving..." : "Set Expiry"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
