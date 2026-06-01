"use client";

import React from "react";
import { Check } from "lucide-react";

import { FadeIn } from "@/components/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Pricing() {
  const features = [
    "Unlimited users in your workspace",
    "Various input file formats supported",
    "Professional PDF summaries delivered",
    "Direct support from our expert team",
    "Secure document processing",
    "Fast turnaround times",
  ];

  return (
    <>
      <a id="pricing" />
      <FadeIn>
        <div className="w-full bg-muted/30 px-6 py-12">
          <div className="mx-auto max-w-4xl text-center">
            {/* Pricing Badge */}
            <div className="mb-2 inline-flex items-center justify-center">
              <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                [ Simple Pricing ]
              </span>
            </div>
            <h2 className="montserrat mb-4 text-[32px] font-bold text-foreground">
              One Plan, Everything Included
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Professional deposition summaries with transparent, predictable
              pricing
            </p>
          </div>

          <div className="mx-auto max-w-5xl">
            <Card className="overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* Pricing Section */}
                <div className="border-r bg-primary/5 p-8 lg:w-1/2">
                  <CardHeader className="mb-6 p-0">
                    <CardTitle className="text-center text-2xl font-bold lg:text-left">
                      In Depo Veritas - Essential Plan
                    </CardTitle>
                  </CardHeader>

                  <div className="space-y-6">
                    <div className="text-center lg:text-left">
                      <div className="flex items-baseline justify-center gap-2 lg:justify-start">
                        <span className="text-4xl font-bold text-primary">
                          $49.95
                        </span>
                        <span className="text-lg text-muted-foreground">
                          /month
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        For up to 10 depositions
                      </p>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-baseline justify-center gap-2 lg:justify-start">
                        <span className="text-2xl font-semibold text-foreground">
                          $4.95
                        </span>
                        <span className="text-sm text-muted-foreground">
                          per additional deposition
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        After your first 10 depositions each month
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features Section */}
                <div className="p-8 lg:w-1/2">
                  <CardContent className="p-0">
                    <h3 className="mb-4 text-center text-lg font-semibold lg:text-left">
                      What's Included
                    </h3>
                    <ul className="space-y-3">
                      {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </FadeIn>
    </>
  );
}
