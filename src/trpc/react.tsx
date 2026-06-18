"use client";

import { type AppRouter } from "@/server/api/root";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
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
import { accessDeniedRedirectTarget } from "@/lib/access-control";

export const api = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  return process.env.NEXT_PUBLIC_DEPLOYMENT_URL;
}

/**
 * Global handler for access-denied errors (IMP-003). When a query or mutation
 * fails because the user's access expired or they were suspended mid-session,
 * the backend revokes the session and tags the error with a discriminator.
 * Here we surface that instead of letting it fail silently: redirect to the
 * login screen carrying the reason so the user sees a clear message rather
 * than an unexplained logout. Ordinary errors (including a plain UNAUTHORIZED
 * from a normal logout) carry no discriminator and are left untouched.
 */
function handleGlobalQueryError(error: unknown) {
  if (typeof window === "undefined") return;
  const target = accessDeniedRedirectTarget(error, window.location.pathname);
  if (target) {
    window.location.href = target;
  }
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleGlobalQueryError }),
        mutationCache: new MutationCache({ onError: handleGlobalQueryError }),
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
