"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CiAt } from "react-icons/ci";
import { FaArchway, FaCreditCard, FaUser } from "react-icons/fa6";
import { GrNotification } from "react-icons/gr";
import { HiOutlineQuestionMarkCircle } from "react-icons/hi2";
import {
  RiAdminLine,
  RiHome2Fill,
  RiOrganizationChart,
  RiTeamLine,
} from "react-icons/ri";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useMemo } from "react";
import InDepoVeritasLogoButton from "@/features/shared/indepoveritas-logo-button";
import { UserNav } from "@/features/shared/user-nav";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType;
  subLinks?: NavSubLink[];
  subLinksOpen?: boolean;
}

interface NavSubLink {
  title: string;
  href: string;
  icon: React.ComponentType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function AppSidebar() {
  const { data: me } = api.me.get.useQuery();
  const pathname = usePathname();

  const navGroups = useMemo(() => {
    const groups: NavGroup[] = [
      {
        title: "Depositions",
        items: [
          {
            name: "Dashboard",
            href: "/app",
            icon: RiHome2Fill,
          },
        ],
      },
      {
        title: "Settings",
        items: [
          {
            name: "Account",
            href: "/app/settings/account",
            icon: FaUser,
          },
          // {
          //   name: "Domains",
          //   href: "/app/settings/domains",
          //   icon: CiAt,
          // },
          {
            name: "Notifications",
            href: "/app/settings/notifications",
            icon: GrNotification,
          },
          {
            name: "Billing",
            href: "/app/settings/billing",
            icon: FaCreditCard,
          },
          {
            name: "Team",
            href: "/app/settings/team",
            icon: RiTeamLine,
          },
        ],
      },
      {
        title: "Help",
        items: [
          {
            name: "Help Center",
            href: "/app/support",
            icon: HiOutlineQuestionMarkCircle,
          },
        ],
      },
      ...(me?.role === "admin"
        ? [
            {
              title: "Administration",
              items: [
                {
                  name: "Admin",
                  href: "/app/admin",
                  icon: FaArchway,
                  subLinksOpen: pathname.includes("/app/admin"),
                  subLinks: [
                    {
                      title: "Users",
                      href: "/app/admin/users",
                      icon: RiAdminLine,
                    },
                    {
                      title: "Files",
                      href: "/app/admin/documents",
                      icon: FaUser,
                    },
                    // {
                    //   title: "Organizations",
                    //   href: "/app/admin/organizations",
                    //   icon: RiOrganizationChart,
                    // },
                  ],
                },
              ],
            },
          ]
        : []),
    ];

    return groups;
  }, [me?.role, pathname]);

  return (
    <Sidebar className="sidebar-yellow border-r border-gray-200/10 bg-yellow/10 shadow-md">
      <SidebarHeader className="flex h-16 items-center px-4">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <InDepoVeritasLogoButton />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="mx-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.title} className="mb-6">
            <SidebarGroupLabel className="mb-2 text-sm font-semibold text-black">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    {item.subLinks ? (
                      <Collapsible defaultOpen={item.subLinksOpen}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            className={cn(
                              "w-full justify-start text-sm transition-colors hover:bg-gray-50 hover:text-gray-900",
                              pathname === item.href
                                ? "bg-gray-100 text-gray-900"
                                : "text-black",
                            )}
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span className="ml-2">{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="pl-6">
                            {item.subLinks.map((subLink) => (
                              <SidebarMenuSubItem key={subLink.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subLink.href}
                                  className={cn(
                                    "w-full justify-start text-sm transition-colors hover:bg-gray-50 hover:text-gray-900",
                                    pathname === subLink.href
                                      ? "bg-gray-100 text-gray-900"
                                      : "text-black",
                                  )}
                                >
                                  <Link href={subLink.href}>
                                    <subLink.icon />
                                    <span className="ml-2">
                                      {subLink.title}
                                    </span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        className={cn(
                          "w-full justify-start text-sm transition-colors hover:bg-gray-50 hover:text-gray-900",
                          pathname === item.href
                            ? "bg-gray-100 text-gray-900"
                            : "text-black",
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span className="ml-2">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200/20 p-3">
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
