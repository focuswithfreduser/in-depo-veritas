"use client";
import React from "react";
import { toast } from "sonner";
import { Button, LoadingButton } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { LoadingSpinner } from "@/features/shared/loading-spinner";

export default function AddDomain() {
  const [open, setOpen] = React.useState(false);

  // const { data, isLoading } = api.workspace.getCanBeAddedDomain.useQuery();
  // const domain = data?.domain;

  const utils = api.useUtils();

  // const mutation = api.workspace.addDomain.useMutation({
  //   onSuccess: async ({ workspace, domain }) => {
  //     toast.success(`Domain ${domain} added to workspace ${workspace.name}`);
  //     await utils.workspace.invalidate();
  //     setOpen(false);
  //   },
  // });

  return (
    <Dialog open={open} onOpenChange={setOpen} aria-label="Edit profile">
      <DialogTrigger asChild>
        <Button variant="outline">Add domain to workspace</Button>
      </DialogTrigger>
      <DialogContent className="min-w-[600px]">
        <div className="flex flex-col gap-y-4 p-8">
          <div className="text-2xl font-bold">Set up your domain</div>
          <p className="text-sm text-gray-500">
            Select the domain you want to add to your workspace. Users with this
            domain will be able to join your workspace.
          </p>
          {/* {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : domain ? (
            <div className="flex flex-col gap-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{domain}</span>
                <LoadingButton
                  variant="outline"
                  isLoading={mutation.isLoading}
                  onClick={() => {
                    mutation.mutate({
                      domain,
                    });
                  }}
                >
                  Add
                </LoadingButton>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No domains available</div>
          )} */}
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
