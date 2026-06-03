"use client";

import { useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import { Logo } from "./logo";
import Link from "next/link";
import { Organization } from "@/app/generated/prisma/client";
import { EditIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface OnboardingFormProps {
  name: string;
  firstName?: string | null;
  organizationName?: string | null;
  availableOrganizations: Organization[];
  email: string;
}

export default function OnboardingForm({
  name,
  firstName,
  organizationName,
  availableOrganizations,
  email,
}: OnboardingFormProps) {
  const [formData, setFormData] = useState({
    name: name || "",
    firstName: firstName || "",
    organizationName: organizationName || "",
  });
  const [userEditedFirstName, setUserEditedFirstName] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const utils = api.useUtils();

  // Informational only: surfaced to nudge the user to ask for an invitation
  // instead of silently auto-joining (which used to happen here and was a
  // self-join vulnerability — see review S9). Joining now requires an
  // explicit Invitation from an org owner.
  const availableOrg = availableOrganizations[0];

  const updateMutation = api.me.update.useMutation();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData((prev) => ({ ...prev, name: newName }));

    // Auto-populate firstName if it's empty and user hasn't manually edited it
    if (!userEditedFirstName && newName) {
      const firstNameGuess = newName.split(" ")[0];
      setFormData((prev) => ({ ...prev, firstName: firstNameGuess }));
    }
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFirstName = e.target.value;
    setFormData((prev) => ({ ...prev, firstName: newFirstName }));

    // Track that user has manually edited first name
    // If they delete it, we want to auto-populate it again
    setUserEditedFirstName(newFirstName.length > 0);
  };

  const handleOrganizationNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setFormData((prev) => ({ ...prev, organizationName: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.organizationName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setLoading(true);

    try {
      await updateMutation.mutateAsync({
        name: formData.name.trim(),
        firstName: formData.firstName?.trim(),
        workspaceName: formData.organizationName.trim(),
      });

      await utils.me.get.invalidate();
      toast.success("Account ready");
      router.push("/app");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          Create Your Account
        </h1>
        <p className="text-muted-foreground">
          Email complete! You're in at{" "}
          <Link href="/" className="mx-1 underline">
            In Depo Veritas
          </Link>
          . Let&apos;s create your account
        </p>
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          {email}{" "}
          <EditIcon
            className="ml-2 h-4 w-4 cursor-pointer text-blue-500 hover:text-blue-600"
            onClick={async () => {
              if (
                window.confirm(
                  "Are you sure you want to change your email? You will be asked to provide a verification code",
                )
              ) {
                await authClient.signOut();
                router.push("/login");
              }
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">What's your full name?</Label>
        <Input
          id="name"
          type="text"
          placeholder="Your full name"
          value={formData.name}
          onChange={handleNameChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="firstName">What should we call you?</Label>
        <Input
          id="firstName"
          type="text"
          placeholder="Your first name"
          value={formData.firstName}
          onChange={handleFirstNameChange}
        />
      </div>

      {/* Informational notice when another org already uses this email domain */}
      {availableOrganizations.length > 0 && availableOrg && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
          <p>
            <strong>{availableOrg.name}</strong> already uses your email domain.
            To join it, ask an owner of that organization to invite you.
            Otherwise create your own organization below.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="organizationName">Your Firm</Label>
        <Input
          id="organizationName"
          type="text"
          placeholder="Your firm or organization name"
          value={formData.organizationName}
          onChange={handleOrganizationNameChange}
          required
        />
      </div>

      <LoadingButton type="submit" isLoading={loading}>
        Complete Setup
      </LoadingButton>
    </form>
  );
}
