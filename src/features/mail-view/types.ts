import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "@/server/api/root";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type DocumentGet = RouterOutput["document"]["get"];
export type DocumentListRow = RouterOutput["document"]["list"][number];
