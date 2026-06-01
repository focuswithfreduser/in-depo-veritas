"use client";

import { api } from "@/trpc/react";
import WorkspaceDomainsTable from "./domains-table";
import { LoadingCardSpinner } from "@/features/shared/loading-spinner";

export default function Domains() {
  return null;
  // const { data, isLoading } = api.workspace.getDomains.useQuery();

  // if (isLoading) {
  //   return <LoadingCardSpinner />;
  // }

  // return <WorkspaceDomainsTable domains={data?.domains ?? []} />;
}
