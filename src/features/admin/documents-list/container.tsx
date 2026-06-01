"use client";

import { LoadingBlur } from "@/components/loading-blur";
import { api } from "@/trpc/react";
import DataTable from "./data-table";

export default function AdminViewFiles() {
  const { data, isLoading } = api.admin.listFiles.useQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
      </div>
      <LoadingBlur loading={isLoading} />
      {data && <DataTable data={data} />}
    </div>
  );
}
