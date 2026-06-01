import { createTRPCRouter, publicProcedure } from "../trpc";

export const testRouter = createTRPCRouter({
  throwServerError: publicProcedure.mutation(async () => {
    // Simulate async work with delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Throw the error on the server
    throw new Error("This is a test server side error.");
  }),
});
