import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { NuqsAdapter } from "nuqs/adapters/next/app";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  });

  if (!session?.user.name || !session?.session.activeOrganizationId) {
    redirect("/onboarding");
  }

  return (
    <NuqsAdapter>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "13rem",
            "--sidebar-width-mobile": "18rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-x-auto overflow-y-hidden bg-white">
          <div className="flex items-center p-2 lg:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="min-w-0 p-2 md:p-6">{children}</div>
          </div>
        </main>
      </SidebarProvider>
    </NuqsAdapter>
  );
}
