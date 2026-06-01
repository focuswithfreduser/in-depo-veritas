import { Metadata } from "next";
import Image from "next/image";

import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "settings",
  description: "In Depo Veritas Settings.",
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <>
      <div className="pb-16">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">
            Settings
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Manage your account settings, billing, and set e-mail preferences.
          </p>
        </div>
        <Separator className="my-4 md:my-6" />
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <div className="flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </>
  );
}
