import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "@/server/api/root";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type UserAdminView =
  RouterOutput["admin"]["listUsersWithOrganizations"][number];
