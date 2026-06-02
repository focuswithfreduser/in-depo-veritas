"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface SuspendUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentBanExpires: Date | null;
  currentBanned: boolean;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function SuspendUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentBanExpires,
  currentBanned,
}: SuspendUserDialogProps) {
  const utils = api.useUtils();
  const [date, setDate] = React.useState<Date | undefined>(
    currentBanExpires ?? undefined,
  );
  const [reason, setReason] = React.useState("");
  const [permanent, setPermanent] = React.useState(
    currentBanned && currentBanExpires === null,
  );
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDate(currentBanExpires ?? undefined);
      setReason("");
      setPermanent(currentBanned && currentBanExpires === null);
    }
  }, [open, currentBanExpires, currentBanned]);

  const mutation = api.admin.setUserSuspension.useMutation({
    onSuccess: (data) => {
      if (data.banned && data.banExpires) {
        toast.success(
          `${userName} suspended until ${format(data.banExpires, "PPP")}`,
        );
      } else if (data.banned) {
        toast.success(`${userName} suspended (no expiry)`);
      } else {
        toast.success(`${userName} unsuspended`);
      }
      onOpenChange(false);
      utils.admin.listUsersWithOrganizations.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update suspension");
    },
  });

  const handleSave = () => {
    if (!permanent && !date) {
      toast.error("Pick a date or mark as permanent");
      return;
    }
    mutation.mutate({
      userId,
      expiresAt: permanent ? null : date ? endOfDay(date) : null,
      permanent,
      reason: reason || undefined,
    });
  };

  const handleClear = () => {
    mutation.mutate({ userId, expiresAt: null });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Suspend User</DialogTitle>
          <DialogDescription>
            Block <strong>{userName}</strong> from using the app. Choose a
            date to auto-restore access, or mark as permanent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {currentBanned && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm">
              {currentBanExpires
                ? `Currently suspended until ${format(currentBanExpires, "PPP")}.`
                : "Currently permanently suspended."}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="permanent-suspension"
              checked={permanent}
              onCheckedChange={(checked) => setPermanent(checked === true)}
            />
            <Label
              htmlFor="permanent-suspension"
              className="cursor-pointer text-sm font-normal"
            >
              Permanent suspension (no auto-restore)
            </Label>
          </div>

          {!permanent && (
            <div className="space-y-2">
              <Label>Auto-restore on</Label>
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
                Suspension is lifted automatically at end of day on this date.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Policy violation"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {currentBanned && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                disabled={mutation.isPending}
              >
                Unsuspend
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
              variant="destructive"
              onClick={handleSave}
              disabled={mutation.isPending || (!permanent && !date)}
            >
              {mutation.isPending ? "Saving..." : "Suspend"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
