"use client";
import { FlashMessage } from "@/app/app/page";
import { MailContainer } from "@/features/mail-view/mail-container";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function Home(props: { flash: FlashMessage | null }) {
  const { data: me, isLoading } = api.me.get.useQuery();

  const utils = api.useUtils();
  const router = useRouter();

  useEffect(() => {
    if (me && (!me?.firstName || !me?.organization)) {
      router.push("/onboarding");
    }
  }, [me, router]);

  useEffect(() => {
    if (isLoading || props.flash === null) {
      return;
    }
    switch (props.flash) {
      case "subscription.subscribe.success":
        utils.me.get.invalidate();
        toast.success("Thanks for subscribing!");
        break;
      case "subscription.cancel.success":
        utils.me.get.invalidate();
        toast.success("Your subscription was canceled.");
        break;
      case "subscription.restore.success":
        utils.me.get.invalidate();
        toast.success("Your subscription was restored.");
        break;
      default:
        const exhaustiveCheck: never = props.flash;
        throw new Error(`Unhandled message ${props.flash}`);
    }
  }, [props.flash, isLoading, utils]);

  return <MailContainer />;
}
