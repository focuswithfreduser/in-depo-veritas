"use client";

import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

const linkClasses = "cursor-pointer hover:cursor-pointer";
const upgradeLinkClasses = "cursor-pointer underline hover:cursor-pointer";

function getTimeBasedGreeting(firstName: string) {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return `Good morning, `;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon, `;
  } else {
    return `Evening, `;
  }
}

function UpgradeLink() {
  return (
    <Link href="/app/settings/billing" className={upgradeLinkClasses}>
      Upgrade plan for more depos
    </Link>
  );
}

function BillingInfoWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 text-sm text-muted-foreground">
      <p>{children}</p>
    </div>
  );
}

export function WelcomeBanner() {
  const { data: me } = api.me.get.useQuery();
  const { data: usageData } = api.billing.usage.useQuery({ live: false });

  const firstName = me?.firstName || me?.name || "there";

  const getBillingInfo = () => {
    if (!usageData) return null;

    if (usageData.type === "trial") {
      const timeLeft = formatDistanceToNow(usageData.endsAt, {
        addSuffix: true,
      });
      const documentsLeft =
        Number(usageData.available) - Number(usageData.used);

      return (
        <BillingInfoWrapper>
          Free trial expires {timeLeft} • {documentsLeft} document
          {/* {documentsLeft !== 1 ? "s" : ""} remaining • <UpgradeLink /> */}
        </BillingInfoWrapper>
      );
    }

    if (usageData.type === "subscription") {
      return (
        <BillingInfoWrapper>
          Active subscription •{" "}
          <Link href="/app/settings/billing" className={linkClasses}>
            {Number(usageData.used)} documents
          </Link>{" "}
          summarized this period
        </BillingInfoWrapper>
      );
    }

    if (usageData.type === "freeForever") {
      return (
        <BillingInfoWrapper>
          {Number(usageData.used)} documents processed {/* <UpgradeLink /> */}
        </BillingInfoWrapper>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-start">
      <h1 className="text-lg font-medium">
        {getTimeBasedGreeting(firstName)}
        <Link href="/app/settings/account" className={linkClasses}>
          {firstName}
        </Link>
      </h1>
      {getBillingInfo()}
    </div>
  );
}
