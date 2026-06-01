import { Home } from "@/components/home";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "In Depo Veritas: Depositions",
};

const validFlashMessages = [
  "subscription.subscribe.success",
  "subscription.cancel.success",
  "subscription.restore.success",
] as const;
export type FlashMessage = (typeof validFlashMessages)[number];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const search = await searchParams;
  const flash: FlashMessage | null =
    validFlashMessages.find((fm) => fm === search["flash"]) || null;

  return <Home flash={flash} />;
}
