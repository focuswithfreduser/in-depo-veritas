"use client";

import { type AppRouter } from "@/server/api/root";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  httpBatchLink,
  httpBatchStreamLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";

export const api = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  return process.env.NEXT_PUBLIC_DEPLOYMENT_URL;
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false, // Disable to prevent re-renders on focus
            refetchOnReconnect: true,
            refetchInterval: 1000 * 60 * 5, // 5 minutes instead of 30 seconds
            refetchOnMount: true,
            // Add a default staleTime to reduce unnecessary refetches
            staleTime: 1000 * 60 * 2, // 2 minutes
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        splitLink({
          condition: (op) => {
            return op.path.endsWith("_streaming");
          },
          true: httpBatchStreamLink({
            url: `${getBaseUrl()}/api/trpc`,
            transformer: superjson,
          }),
          false: splitLink({
            condition: (op) => isNonJsonSerializable(op.input),
            true: httpLink({
              url: `${getBaseUrl()}/api/trpc`,
              transformer: {
                serialize: (data) => data,
                deserialize: superjson.deserialize,
              },
            }),
            false: httpBatchLink({
              url: `${getBaseUrl()}/api/trpc`,
              transformer: superjson,
            }),
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}
