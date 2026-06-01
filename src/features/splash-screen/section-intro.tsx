"use client";
import clsx from "clsx";

import { FadeIn } from "@/components/fade-in";
import { Container } from "./container";

export function SectionIntro({
  title,
  eyebrow,
  children,
  smaller = false,
  invert = false,
  ...props
}: Omit<
  React.ComponentPropsWithoutRef<typeof Container>,
  "title" | "children"
> & {
  title: string;
  eyebrow?: string;
  children?: React.ReactNode;
  smaller?: boolean;
  invert?: boolean;
}) {
  return (
    <Container {...props}>
      <FadeIn className="max-w-2xl">
        <h2>
          {eyebrow && (
            <>
              <span
                className={clsx(
                  "font-display mb-6 block text-base font-semibold text-white",
                )}
              >
                {eyebrow}
              </span>
              <span className="sr-only"> - </span>
            </>
          )}
          <span
            className={clsx(
              "font-display block tracking-tight text-white [text-wrap:balance]",
              smaller
                ? "text-2xl font-semibold"
                : "text-4xl font-medium sm:text-5xl",
            )}
          >
            {title}
          </span>
        </h2>
        {children && (
          <div
            className={clsx(
              "mt-6 text-xl",
              invert ? "text-neutral-300" : "text-neutral-600",
            )}
          >
            {children}
          </div>
        )}
      </FadeIn>
    </Container>
  );
}
