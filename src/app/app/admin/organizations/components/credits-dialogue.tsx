import { useState, useRef } from "react";

import { LoadingButton } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

export function CreditsDialogue({
  open,
  setOpen,
  onSubmit,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSubmit: (credits: number) => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit available credits</DialogTitle>
          <DialogDescription>
            Edit the number of available credits for the organization's trial
            period.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="mx-auto flex w-full space-x-4">
            <Input type="number" placeholder="Credits" ref={inputRef} />
          </div>
        </div>
        <DialogFooter>
          <LoadingButton
            isLoading={isLoading}
            onClick={async () => {
              const parsed = parseInt(inputRef.current?.value || "", 10);
              if (Number.isNaN(parsed)) {
                return;
              }
              setIsLoading(true);
              try {
                await onSubmit(parsed);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            Update
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
