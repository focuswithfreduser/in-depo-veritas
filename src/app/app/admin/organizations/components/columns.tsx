"use client";

import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { api } from "@/trpc/react";
import { toast } from "sonner";

import DataTableColumnHeader from "@/components/ui/data-table/header";
import { OrganizationsAdminView } from "./types";
import { type Trial } from "@/app/generated/prisma";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditsDialogue } from "./credits-dialogue";

const columnHelper = createColumnHelper<OrganizationsAdminView>();

export const columns = [
  columnHelper.accessor("id", {
    id: "id",
  }),
  columnHelper.accessor("name", {
    id: "name",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} name={"Name"} />;
    },
    cell: (props) => {
      const value = props.getValue<string>();
      return (
        <div className="flex flex-col items-start gap-2">
          <div>{value}</div>
        </div>
      );
    },
  }),
  columnHelper.accessor("freeForever", {
    id: "freeForever",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} name={"Free Forever"} />;
    },
    cell: (props) => {
      const isFreeForever = props.getValue<boolean>();
      return <div>{isFreeForever ? "Yes" : "No"}</div>;
    },
  }),
  columnHelper.accessor("trial", {
    id: "trial",
    header: ({ column }) => {
      return <div>Trial</div>;
    },
    cell: (props) => {
      const trial = props.getValue<Trial>();
      return (
        <>
          <div>
            {trial.creditsUsed} / {trial.creditsAvailable} credits used
          </div>
          <div>
            Ends{" "}
            {trial.endsAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            })}
          </div>
        </>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    cell: (ctx: unknown) => {
      const context = ctx as {
        row: { original: { id: string } };
        refetch: () => Promise<unknown>;
      };
      return (
        <OrganizationsAdminRowActions
          organizationId={context.row.original.id}
          refetch={context.refetch}
        />
      );
    },
  }),
];

function OrganizationsAdminRowActions({
  organizationId,
  refetch,
}: {
  organizationId: string;
  refetch: () => Promise<unknown>;
}) {
  const [showCreditsDialog, setShowCreditsDialog] = useState<boolean>(false);
  const toggleFreeForeverMutation = api.admin.toggleFreeForever.useMutation({
    async onSuccess() {
      await refetch();
    },
  });

  const topupTrialCreditsMutation = api.admin.topupTrialCredits.useMutation({
    async onSuccess() {
      await refetch();
    },
    onError(err) {
      toast.error(`Failed adding credits: ${err.message}`);
    },
  });

  return (
    <>
      <CreditsDialogue
        open={showCreditsDialog}
        setOpen={(open) => setShowCreditsDialog(open)}
        onSubmit={async (num) => {
          topupTrialCreditsMutation.mutate({
            id: organizationId,
            credits: num,
          });
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              toggleFreeForeverMutation.mutate({ id: organizationId })
            }
          >
            Toggle Free Forever
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCreditsDialog(true)}>
            Edit trial credits
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
