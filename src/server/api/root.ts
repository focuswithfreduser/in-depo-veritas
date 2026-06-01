import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { adminRouter } from "./routers/admin";
import { documentRouter } from "./routers/document";
import { meRouter } from "./routers/me";
import { billingRouter } from "./routers/billing";
import { testRouter } from "./routers/test";
import { organizationRouter } from "./routers/organization";
import { chatRouter } from "./routers/chat";

export const appRouter = createTRPCRouter({
  me: meRouter,
  admin: adminRouter,
  document: documentRouter,
  billing: billingRouter,
  test: testRouter,
  organization: organizationRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
