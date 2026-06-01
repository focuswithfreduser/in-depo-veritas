"use client";

import { Subscription } from "@/app/generated/prisma";
import { LoadingButton } from "@/components/ui/button";

type ManageSubscriptionProps = {
  handleSubscribe: () => void;
  handleCancel: () => void;
  handleRestore: () => void;
  subscription: (Subscription & { status: "active" | "canceled" }) | null;
  isPending: boolean;
};

export function ManageSubscription(props: ManageSubscriptionProps) {
  if (!props.subscription) {
    return (
      <LoadingButton
        isLoading={props.isPending}
        disabled
        // onClick={props.handleSubscribe}
      >
        Subscribe (new subscriptions are currently closed)
      </LoadingButton>
    );
  }
  switch (props.subscription.status) {
    case "active":
      return (
        <LoadingButton
          isLoading={props.isPending}
          disabled={props.isPending}
          onClick={props.handleCancel}
        >
          Cancel subscription
        </LoadingButton>
      );
    case "canceled":
      return (
        <LoadingButton
          isLoading={props.isPending}
          disabled={props.isPending}
          onClick={props.handleRestore}
        >
          Restore canceled subscription
        </LoadingButton>
      );
    default:
      const exhaustiveCheck: never = props.subscription.status;
      throw new Error(`Unhandled status ${props.subscription.status}`);
  }
}
