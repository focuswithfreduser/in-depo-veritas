import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "@/server/api/root";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type AdminFile = RouterOutput["admin"]["listFiles"][number];
