"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function ErrorTrackingTestPage() {
  const errorMutation = api.test.throwServerError.useMutation({
    onError: (error) => {
      toast.error("Server error occurred: " + error.message);
    },
  });

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Server side error test</h1>
      <Button
        onClick={() => errorMutation.mutate()}
        disabled={errorMutation.isPending}
      >
        {errorMutation.isPending
          ? "Triggering server error..."
          : "Trigger Server Error"}
      </Button>
    </div>
  );
}
