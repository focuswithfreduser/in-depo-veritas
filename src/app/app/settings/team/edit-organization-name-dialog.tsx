"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface EditOrganizationNameDialogProps {
  currentName: string;
}

export function EditOrganizationNameDialog({
  currentName,
}: EditOrganizationNameDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(currentName);

  React.useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const utils = api.useUtils();
  const updateMutation = api.organization.updateName.useMutation({
    onSuccess: () => {
      toast.success("Organization name updated successfully");
      setOpen(false);
      utils.me.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update organization name");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateMutation.mutate({ name: name.trim() });
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-2"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Organization Name</DialogTitle>
            <DialogDescription>
              This will change the organization name for all team members.
              Everyone in your organization will see this updated name.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your organization name"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
