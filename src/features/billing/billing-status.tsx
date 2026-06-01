"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { SubscriptionStatus, type Subscription } from "@/app/generated/prisma";
import { UsageData } from "./usage";
import { ManageSubscription } from "./manage";
import { RetiredSubscriptions } from "./retired";
import { Separator } from "@/components/ui/separator";
import { type UsageStats } from "@/server/api/routers/billing";
import { FlashMessage } from "@/app/app/page";
import { DiscountCodeModal } from "./discount-code-modal";

type BillingStatusProps = {
  subscriptions: Subscription[];
  usageData: UsageStats;
};

export function BillingStatus(props: BillingStatusProps) {
  const router = useRouter();

  const subscribeMutation = api.billing.subscribe.useMutation({
    onSuccess(result) {
      router.push(result.url!);
    },
    onError(error) {
      toast.error(
        `An error occured processing your subscription: ${error.message}`,
      );
    },
  });

  const unsubscribeMutation = api.billing.unsubscribe.useMutation({
    onSuccess(result) {
      router.push(result.url!);
    },
    onError(error) {
      toast.error(
        `An error occured processing your unsubscription: ${error.message}`,
      );
    },
  });

  const restoreSubscriptionMutation =
    api.billing.restoreSubscription.useMutation({
      async onSuccess(result) {
        router.push(result.url!);
      },
      onError(error) {
        toast.error(
          `An error occured restoring your subscription: ${error.message}`,
        );
      },
    });

  const subscriptionsByStatus = props.subscriptions.reduce(
    (acc, sub) => {
      acc[sub.status].push(sub);
      return acc;
    },
    { active: [], canceled: [], retired: [] } as Record<
      SubscriptionStatus,
      Subscription[]
    >,
  );

  const validSubscription = (
    subscriptionsByStatus.active.length
      ? subscriptionsByStatus.active[0]
      : subscriptionsByStatus.canceled.length
      ? subscriptionsByStatus.canceled[0]
      : null
  ) as Subscription & { status: "active" | "canceled" };

  const hasActiveSubscription = subscriptionsByStatus.active.length > 0;

  return (
    <>
      <UsageData stats={props.usageData} subscription={validSubscription} />
      {!hasActiveSubscription && (
        <div className="mt-4 text-sm text-muted-foreground">
          Have a discount code?{" "}
          <DiscountCodeModal>
            <button className="text-primary underline underline-offset-4 hover:no-underline">
              Enter it here
            </button>
          </DiscountCodeModal>
          .
        </div>
      )}
      {props.usageData.type !== "freeForever" ? (
        <ManageSubscription
          handleSubscribe={() =>
            subscribeMutation.mutate({
              returnUrl: {
                success: getRedirectUrl({
                  pathname: "/app",
                  search: { flash: "subscription.subscribe.success" },
                }),
                cancel: getRedirectUrl({}),
              },
            })
          }
          handleCancel={() =>
            unsubscribeMutation.mutate({
              returnUrl: {
                success: getRedirectUrl({
                  pathname: "/app",
                  search: { flash: "subscription.cancel.success" },
                }),
                cancel: getRedirectUrl({}),
              },
            })
          }
          handleRestore={() =>
            restoreSubscriptionMutation.mutate({
              returnUrl: {
                success: getRedirectUrl({
                  pathname: "/app",
                  search: { flash: "subscription.restore.success" },
                }),
                cancel: getRedirectUrl({}),
              },
            })
          }
          subscription={validSubscription}
          isPending={
            subscribeMutation.isPending ||
            unsubscribeMutation.isPending ||
            restoreSubscriptionMutation.isPending
          }
        />
      ) : null}
      {subscriptionsByStatus.retired.length ? (
        <>
          <Separator />
          <RetiredSubscriptions
            subscriptions={
              subscriptionsByStatus.retired as (Subscription & {
                status: "retired";
              })[]
            }
          />
        </>
      ) : null}
    </>
  );
}

type SearchValues = {
  flash: FlashMessage;
};

type SearchParameters = {
  [K in "flash"]?: SearchValues[K];
};

function getRedirectUrl({
  pathname,
  search,
}: {
  pathname?: string;
  search?: SearchParameters;
}): string {
  const url = new window.URL(window.location.href);
  if (pathname) {
    url.pathname = pathname;
  }
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      url.searchParams.append(key, value);
    }
  }
  return url.toString();
}
