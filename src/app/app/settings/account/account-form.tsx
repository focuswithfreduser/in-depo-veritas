"use client";

import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";

import { LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/trpc/react";

const createMyOwnWorkspaceId = "create-my-own-workspace";
// const languages = [
//   { label: "English", value: "en" },
//   { label: "French", value: "fr" },
//   { label: "German", value: "de" },
//   { label: "Spanish", value: "es" },
//   { label: "Portuguese", value: "pt" },
//   { label: "Russian", value: "ru" },
//   { label: "Japanese", value: "ja" },
//   { label: "Korean", value: "ko" },
//   { label: "Chinese", value: "zh" },
// ] as const;

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Name must be at least 2 characters.",
    })
    .max(30, {
      message: "Name must not be longer than 30 characters.",
    }),
  firstName: z.string().optional(),
  // language: z.string({
  //   required_error: "Please select a language.",
  // }),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

type Workspace = {
  id: string;
  name: string;
};

export default function AccountForm({
  name,
  firstName,
  workspaceName,
  disableWorkspace = false,
  availableWorkspaces,
  domain,
}: {
  name: string;
  firstName?: string | null;
  workspaceName: string;
  disableWorkspace?: boolean;
  availableWorkspaces: Workspace[];
  domain?: string | null;
}) {
  const utils = api.useUtils();

  const updateMutation = api.me.update.useMutation();
  // const joinWorkspaceMutation = api.workspace.join.useMutation({
  //   onSuccess: async ({ user }) => {
  //     toast.success(`You have joined the workspace ${user.workspace?.name}`);
  //     await utils.workspace.invalidate();
  //     await utils.me.invalidate();
  //     window.location.reload();
  //   },
  // });

  const [loading, setLoading] = useState(false);
  const [userEditedFirstName, setUserEditedFirstName] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: name ?? "",
    firstName: firstName ?? "",
  });

  const validateForm = () => {
    try {
      accountFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    await updateMutation.mutateAsync({
      name: formData.name.trim(),
      firstName: formData.firstName?.trim(),
      workspaceName: workspaceName.trim(),
    });
    toast(`Settings updated successfully`);
    setLoading(false);
    window.location.reload();
  }

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="name">What's your full name?</Label>
        <Input
          id="name"
          placeholder="Your full name"
          value={formData.name}
          onChange={(e) => {
            updateFormData("name", e.target.value);
            // Auto-populate firstName if it's empty
            if (!userEditedFirstName && e.target.value) {
              const firstNameGuess = e.target.value.split(" ")[0];
              updateFormData("firstName", firstNameGuess);
            }
          }}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="firstName">What should we call you?</Label>
        <Input
          id="firstName"
          placeholder="Your first name"
          value={formData.firstName}
          onChange={(e) => {
            updateFormData("firstName", e.target.value);
            // If the user has edited the first name, we don't want to auto-populate it
            // In case they deleted it, we want to auto-populate it again
            setUserEditedFirstName(e.target.value.length > 0);
          }}
        />
        {errors.firstName && (
          <p className="text-sm text-destructive">{errors.firstName}</p>
        )}
      </div>

      <LoadingButton isLoading={loading} type="submit">
        Update account
      </LoadingButton>
    </form>
  );
}
