"use client";

import { type UsageStats } from "@/server/api/routers/billing";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
  TableHead,
} from "@/components/ui/table";
import { Subscription } from "@/app/generated/prisma";

type UsageDataProps = {
  stats: UsageStats;
  subscription: Subscription | null;
};

export function UsageData(props: UsageDataProps) {
  return (
    <Table>
      {(() => {
        switch (props.stats.type) {
          case "freeForever":
            return (
              <>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Documents summarized</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Free forever</TableCell>
                    <TableCell>{props.stats.used.toString()}</TableCell>
                  </TableRow>
                </TableBody>
              </>
            );
          case "subscription":
            return (
              <>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Period Start</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead>
                      Documents summarized in the current period
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      {props.subscription!.plan}{" "}
                      {props.subscription!.status === "canceled"
                        ? "(Canceled at the next period end)"
                        : null}
                    </TableCell>
                    <TableCell>
                      {props.stats.periodStart.toLocaleDateString("en-US")}
                    </TableCell>
                    <TableCell>
                      {props.stats.periodEnd.toLocaleDateString("en-US")}
                    </TableCell>
                    <TableCell>{props.stats.used.toString()}</TableCell>
                  </TableRow>
                </TableBody>
              </>
            );
          case "trial":
            return (
              <>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Ends</TableHead>
                    <TableHead>Documents summarized</TableHead>
                    <TableHead>Free summaries remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Free trial</TableCell>
                    <TableCell>
                      {props.stats.endsAt.toLocaleDateString("en-US")}
                    </TableCell>
                    <TableCell>{props.stats.used.toString()}</TableCell>
                    <TableCell>{props.stats.available.toString()}</TableCell>
                  </TableRow>
                </TableBody>
              </>
            );
          default:
            const exhaustiveCheck: never = props.stats;
            throw new Error(`Unknown type ${props.stats}`);
        }
      })()}
    </Table>
  );
}
