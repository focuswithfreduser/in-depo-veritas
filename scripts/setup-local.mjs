import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureEnvLocal() {
  if (existsSync(".env.local")) return;

  if (!existsSync(".env.example")) {
    console.error("Missing .env.local and .env.example");
    process.exit(1);
  }

  copyFileSync(".env.example", ".env.local");

  let env = readFileSync(".env.local", "utf8");
  const replacements = {
    BETTER_AUTH_SECRET: '"dev-secret-change-me-in-production"',
    TRIGGER_SECRET_KEY: '"tr_dev_placeholder"',
    ANTHROPIC_API_KEY: '"sk-ant-dev-placeholder"',
    OPENAI_API_KEY: '"sk-dev-placeholder"',
    RESEND_API_KEY: '"re_dev_placeholder"',
    SUPABASE_SERVICE_ROLE_KEY: '"dev-supabase-service-role-placeholder"',
    SCREENSHOT_API_KEY: '"dev-screenshot-api-key"',
    STRIPE_SECRET_KEY: '"sk_test_placeholder"',
    STRIPE_WEBHOOK_SIGNING_SECRET: '"whsec_placeholder"',
    POSTGRES_PRISMA_URL:
      '"postgresql://user:pass@localhost:5432/indepoveritas?schema=public"',
    POSTGRES_URL_NON_POOLING:
      '"postgresql://user:pass@localhost:5432/indepoveritas?schema=public"',
    NEXT_PUBLIC_DEPLOYMENT_URL: '"http://localhost:4049"',
    TRPC_BASE_URL: '"http://localhost:4049/api/trpc"',
    NEXT_PUBLIC_SUPABASE_URL: '"https://jnyuzoopvdcxuvwgatgw.supabase.co"',
  };

  for (const [key, value] of Object.entries(replacements)) {
    if (env.includes(`${key}=`)) {
      env = env.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
    } else {
      env += `\n${key}=${value}`;
    }
  }

  writeFileSync(".env.local", env);
  console.log("Created .env.local for local development");
}

function ensurePostgres() {
  const start = spawnSync("docker", ["start", "postgres-indepoveritas"], {
    shell: true,
  });

  if (start.status !== 0) {
    console.log("Starting new postgres container...");
    run("docker", [
      "run",
      "--name",
      "postgres-indepoveritas",
      "-d",
      "-p",
      "5432:5432",
      "-e",
      "POSTGRES_USER=user",
      "-e",
      "POSTGRES_PASSWORD=pass",
      "-e",
      "POSTGRES_DB=indepoveritas",
      "postgres:alpine",
    ]);
  }
}

ensureEnvLocal();
ensurePostgres();
run("pnpm", ["generate"]);
run("pnpm", [
  "exec",
  "dotenv",
  "-e",
  ".env.local",
  "--",
  "npx",
  "prisma",
  "migrate",
  "deploy",
]);
run("pnpm", ["bootstrap:dev"]);

console.log("");
console.log("Local setup complete. Run: pnpm dev");
console.log("Login: dev@local.dev");
