"use client";

import Error from "next/error";
import Link from "next/link";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html>
      <body className="flex h-screen flex-col items-center justify-center space-y-4">
        <Link
          href="/app"
          className="absolute left-1/2 top-2 -translate-x-1/2 text-gray-400 underline"
        >
          Go back to In Depo Veritas
        </Link>
        <Error
          statusCode={500}
          title="An unexpected error has occurred"
          {...error}
        />
      </body>
    </html>
  );
}
