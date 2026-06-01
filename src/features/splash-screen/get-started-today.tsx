"use client";

import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GetStartedToday() {
  return (
    <div className="w-full bg-background px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <FadeIn>
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center justify-center">
            <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
              [ Ready to Get Started? ]
            </span>
          </div>

          {/* Main Heading */}
          <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Start summarizing depositions today
          </h2>

          {/* Description */}
          <div className="mx-auto mb-12 max-w-2xl">
            <p className="text-lg font-normal leading-relaxed text-muted-foreground md:text-xl">
              Join legal professionals who save hours every week with AI-powered
              deposition summaries.
            </p>
          </div>

          {/* CTA Button */}
          <div className="space-y-4">
            <Link href="/login">
              <Button size="lg" className="px-8 py-6 text-lg">
                Log In →
              </Button>
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
