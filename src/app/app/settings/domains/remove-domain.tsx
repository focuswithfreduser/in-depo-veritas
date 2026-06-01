"use client";
import React from "react";
import { toast } from "sonner";
import { Button, LoadingButton } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/trpc/react";

type RemoveDomainProps = {
  domain: string;
};

export default function RemoveDomain({ domain }: RemoveDomainProps) {
  const [open, setOpen] = React.useState(false);

  const utils = api.useUtils();

  // const mutation = api.workspace.removeDomain.useMutation({
  //   onSuccess: async ({ workspace, domain }) => {
  //     toast.success(
  //       `Domain ${domain} removed from workspace ${workspace.name}`,
  //     );
  //     setOpen(false);
  //     await utils.workspace.invalidate();
  //   },
  // });

  return (
    <Dialog open={open} onOpenChange={setOpen} aria-label="Edit profile">
      <DialogTrigger asChild>
        <Button variant="destructive">Remove</Button>
      </DialogTrigger>
      <DialogContent className="min-w-[600px]">
        <div className="flex flex-col gap-y-4 p-8">
          <div className="text-2xl font-bold">Remove your domain</div>
          <p className="text-sm text-gray-500">
            Are you sure you want to remove <strong>{domain}</strong> from your
            workspace?
          </p>

          <div className="flex justify-between">
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              isLoading={false}
              onClick={() => {
                // mutation.mutate({
                //   domain,
                // });
              }}
            >
              Remove
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
