"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";

function NotificationsFormInner({
  marketingEmails: initialMarketingEmails,
  productUpdates: initialProductUpdates,
  shouldEmailOnComplete: initialShouldEmailOnComplete,
}: {
  marketingEmails: boolean;
  productUpdates: boolean;
  shouldEmailOnComplete: boolean;
}) {
  const [marketingEmails, setMarketingEmails] = useState(
    initialMarketingEmails,
  );
  const [productUpdates, setProductUpdates] = useState(initialProductUpdates);
  const [shouldEmailOnComplete, setShouldEmailOnComplete] = useState(
    initialShouldEmailOnComplete,
  );

  const mutation = api.me.updateEmailPreferences.useMutation();

  const updatePreference = (field: string, value: boolean) => {
    const newPreferences = {
      marketingEmails: field === "marketingEmails" ? value : marketingEmails,
      productUpdates: field === "productUpdates" ? value : productUpdates,
      shouldEmailOnComplete:
        field === "shouldEmailOnComplete" ? value : shouldEmailOnComplete,
    };

    mutation.mutate(newPreferences, {
      onSuccess() {
        toast.success("Email preference updated");
      },
      onError(err) {
        toast.error(err.message);
        // Revert the state on error
        if (field === "marketingEmails") setMarketingEmails(!value);
        if (field === "productUpdates") setProductUpdates(!value);
        if (field === "shouldEmailOnComplete") setShouldEmailOnComplete(!value);
      },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-medium">Email Notifications</h3>
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Marketing emails</div>
              <div className="text-sm text-muted-foreground">
                Receive emails about new products, features, and more.
              </div>
            </div>
            <Switch
              checked={marketingEmails}
              onCheckedChange={(value) => {
                setMarketingEmails(value);
                updatePreference("marketingEmails", value);
              }}
              disabled={mutation.isPending}
            />
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="text-base font-medium">
                Product Release Updates
              </div>
              <div className="text-sm text-muted-foreground">
                Receive emails regarding our product release features.
              </div>
            </div>
            <Switch
              checked={productUpdates}
              onCheckedChange={(value) => {
                setProductUpdates(value);
                updatePreference("productUpdates", value);
              }}
              disabled={mutation.isPending}
            />
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="text-base font-medium">
                Summary Completion Notifications
              </div>
              <div className="text-sm text-muted-foreground">
                Receive emails when your document summaries are ready.
              </div>
            </div>
            <Switch
              checked={shouldEmailOnComplete}
              onCheckedChange={(value) => {
                setShouldEmailOnComplete(value);
                updatePreference("shouldEmailOnComplete", value);
              }}
              disabled={mutation.isPending}
            />
          </div>

          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Billing and Account</div>
              <div className="text-sm text-muted-foreground">
                Transactional emails and account notifications we need to send
                you while you're using our service.
              </div>
            </div>
            <Switch checked disabled aria-readonly />
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsForm() {
  const { data: me, isLoading } = api.me.get.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h3 className="mb-4 text-lg font-medium">Email Notifications</h3>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="space-y-8">
        <div>
          <h3 className="mb-4 text-lg font-medium">Email Notifications</h3>
          <div className="space-y-4">
            <div className="text-sm text-destructive">
              Failed to load user data
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log(me);

  return (
    <NotificationsFormInner
      marketingEmails={me.marketingEmails}
      productUpdates={me.productUpdates}
      shouldEmailOnComplete={me.shouldEmailOnComplete}
    />
  );
}
