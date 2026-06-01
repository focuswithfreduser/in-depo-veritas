"use client";

import { api } from "@/trpc/react";
import OrganizationsTable from "./components/organizations-table";
import LoadingCard from "@/components/loading-card";

export default function OrganizationsAdminPage() {
  const { data, isLoading, refetch, isRefetching } =
    api.admin.listOrganizations.useQuery();

  if (isRefetching || isLoading || !data) {
    return <LoadingCard />;
  }

  return <OrganizationsTable data={data} refetch={refetch} />;
}
