"use client";

import { api } from "@/trpc/react";
import UsersAdminTable from "./components/users-table";
import LoadingCard from "@/components/loading-card";

export default function UserAdminPage() {
  const { data, isLoading } = api.admin.listUsersWithOrganizations.useQuery();

  if (isLoading) {
    return <LoadingCard />;
  }

  return (
    <div className="w-full">{data && <UsersAdminTable data={data} />}</div>
  );
}
