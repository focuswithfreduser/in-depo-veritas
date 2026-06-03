import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import {
  additionalPackages,
  syncVercelEnvVars,
} from "@trigger.dev/build/extensions/core";

export default defineConfig({
  machine: "small-2x",
  project: "proj_sbfrvfdpevqkdqkhtaat",
  runtime: "node",
  // The logLevel only determines which logs are sent to the Trigger.dev instance when using the logger API. All console based logs are always sent.
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      syncVercelEnvVars(),
      prismaExtension({
        // update this to the path of your Prisma schema file
        schema: "./prisma/schema.prisma",
        directUrlEnvVarName: "POSTGRES_URL_NON_POOLING",
      }),
      additionalPackages({
        packages: ["@prisma/client@6.11.1"],
      }),
    ],
    external: ["@react-email/render"],
  },
});
