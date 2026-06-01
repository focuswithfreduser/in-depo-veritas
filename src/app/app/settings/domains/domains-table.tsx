"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import AddDomain from "./add-domain";
import RemoveDomain from "./remove-domain";

const TABLE_WIDTH_PX = 500;

type Domain = {
  domain: string;
  canRemove: boolean;
};

export default function WorkspaceDomainsTable({
  domains,
}: {
  domains: Domain[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex h-min items-center justify-between">
        <AddDomain />
      </div>
      <div
        className={`rounded-md border ${
          TABLE_WIDTH_PX ? `w-[${TABLE_WIDTH_PX}px]` : "w-full"
        }`}
      >
        <Table>
          <TableBody>
            {domains.length !== 0 ? (
              domains.map(({ domain, canRemove }) => (
                <TableRow key={domain}>
                  <TableCell className="height-[55px] flex items-center justify-between pl-[20px]">
                    {domain}
                    {canRemove && <RemoveDomain domain={domain} />}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center">
                  <div className="pb-2 text-muted-foreground">
                    No domains found
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
