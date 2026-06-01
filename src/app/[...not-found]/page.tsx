"use client";

import Error from "next/error";
import Link from "next/link";

export default function NotFoundError() {
  return (
    <html>
      <body>
        <Link
          href="/app"
          className="absolute left-1/2 top-2 -translate-x-1/2 text-gray-400 underline"
        >
          Go back to In Depo Veritas
        </Link>
        <Error statusCode={404} title="Page not found" />
      </body>
    </html>
  );
}
