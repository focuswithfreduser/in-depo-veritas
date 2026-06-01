"use client";
import { BillingStatus } from "@/features/billing/billing-status";
import { api } from "@/trpc/react";

export default function BillingPage() {
  const { data: subscriptions, isLoading: subscriptionsLoading } =
    api.billing.listSubscriptions.useQuery();
  const { data: usageData, isLoading: usageLoading } =
    api.billing.usage.useQuery({ live: false });

  if (subscriptionsLoading || usageLoading || !subscriptions || !usageData) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <BillingStatus subscriptions={subscriptions} usageData={usageData} />;
}
