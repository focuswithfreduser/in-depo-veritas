"use client";

import { LoadingBlur } from "@/components/loading-blur";
import OnboardingForm from "@/components/onboarding-form";
import { api } from "@/trpc/react";
import { AuthTestimonials } from "../(auth)/components/auth-testimonials";

export default function OnboardingPage() {
  const { data: me, isLoading } = api.me.get.useQuery();

  return (
    <div className="flex min-h-screen">
      <LoadingBlur loading={isLoading} />
      <div className="flex flex-1 flex-col items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-6">
          {me && (
            <OnboardingForm
              availableOrganizations={me?.availableOrganizations ?? []}
              name={me?.name ?? ""}
              firstName={me?.firstName ?? ""}
              organizationName={me?.organization?.name ?? ""}
              email={me?.email ?? ""}
            />
          )}
        </div>
      </div>
      {/* Right side - Testimonials */}
      <AuthTestimonials />
    </div>
  );
}
