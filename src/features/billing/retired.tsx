"use client";

import { Subscription } from "@/app/generated/prisma";
import {
  Table,
  TableBody,
  TableCaption,
  TableRow,
  TableCell,
  TableHeader,
  TableHead,
} from "@/components/ui/table";

type RetiredSubscriptionsProps = {
  subscriptions: (Subscription & { status: "retired" })[];
};

export function RetiredSubscriptions(props: RetiredSubscriptionsProps) {
  return (
    <>
      <h4 className="text-md mb-4 font-medium">
        You have {props.subscriptions.length} retired subscriptions:
      </h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Period Start</TableHead>
            <TableHead>Period End</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.subscriptions.map((sub) => {
            return (
              <TableRow key={`${sub.id}-retired-list`}>
                <TableCell>{sub.plan}</TableCell>
                <TableCell>
                  {sub.periodStart!.toLocaleDateString("en-US")}
                </TableCell>
                <TableCell>
                  {sub.periodEnd!.toLocaleDateString("en-US")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
