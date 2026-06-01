import { api } from "@/trpc/server";
import Domains from "./domains";

export default async function DomainsPage() {
  return <Domains />;
}
