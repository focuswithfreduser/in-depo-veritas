import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { type AppRouter } from "@/server/api/root";
import { env } from "@/create-env.mjs";
import { createLazyResource } from "@/lib/utils/lazy-resource";

export const api = createLazyResource(() =>
  createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        transformer: superjson,
        url: env.TRPC_BASE_URL,
        headers() {
          return {
            "x-api-key": env.SCREENSHOT_API_KEY,
          };
        },
      }),
    ],
  }),
);
