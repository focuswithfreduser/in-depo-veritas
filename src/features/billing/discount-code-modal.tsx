"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { toast } from "sonner";

type DiscountCodeModalProps = {
  children: React.ReactNode;
};

export function DiscountCodeModal({ children }: DiscountCodeModalProps) {
  const [discountCode, setDiscountCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const utils = api.useUtils();

  const applyDiscountMutation = api.billing.applyDiscountCode.useMutation({
    onSuccess: (result) => {
      setShowSuccess(true);
      setDiscountCode("");
      // Invalidate billing data to refresh the UI
      utils.billing.usage.invalidate();
      utils.billing.listSubscriptions.invalidate();
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleClose = () => {
    setIsOpen(false);
    setShowSuccess(false);
    setDiscountCode("");
  };

  const handleApplyCode = () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code");
      return;
    }
    applyDiscountMutation.mutate({ code: discountCode.trim() });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
        else setIsOpen(true);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {showSuccess ? "Success!" : "Enter Discount Code"}
          </DialogTitle>
        </DialogHeader>
        {showSuccess ? (
          <div className="space-y-4 text-center">
            <div className="space-y-2">
              <p className="text-lg font-medium">Discount Code Applied</p>
              <p className="text-muted-foreground">
                Your account now has 10 deposition summaries available to use
                over the next month. Thanks for being a friend of JuryBall!
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discount-code">Discount Code</Label>
              <Input
                id="discount-code"
                type="text"
                placeholder="Enter your discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleApplyCode();
                  }
                }}
                disabled={applyDiscountMutation.isPending}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={applyDiscountMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyCode}
                disabled={applyDiscountMutation.isPending}
              >
                {applyDiscountMutation.isPending ? "Applying..." : "Apply Code"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
