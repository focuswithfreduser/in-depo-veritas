import { Separator } from "@/components/ui/separator";
import { HelpBox } from "@/components/help-box";

export default function SettingsBillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing</h3>
        <HelpBox>
          <p className="font-medium">$49.95 per month includes 10 summaries</p>
          <p>
            Each additional summary costs $4.95. Your subscription covers your
            entire organization with unlimited team members.
          </p>
          <p>
            Manage your trial and subscriptions below. Billing is handled by our
            payment processor, Stripe. Updates to subscriptions might take a few
            moments to be processed. Refresh the page to update to the latest
            state.
          </p>
        </HelpBox>
      </div>
      <Separator />
      {children}
    </div>
  );
}
