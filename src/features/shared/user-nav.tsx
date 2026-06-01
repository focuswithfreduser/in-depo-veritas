"use client";

import {
  BadgeCheck,
  Building2,
  Check,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Mail,
  Plus,
  Shield,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { api } from "@/trpc/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { LoadingBlur } from "@/components/loading-blur";

export function UserNav() {
  const router = useRouter();
  const { data: me, isLoading } = api.me.get.useQuery();
  const { isMobile } = useSidebar();
  const utils = api.useUtils();
  const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const signOutMutation = useMutation({
    mutationFn: async () => {
      return authClient.signOut();
    },
    onSuccess() {
      utils.invalidate();
      router.push("/login");
    },
    onError() {
      toast.error("Oops! Something went wrong. Please try again.");
    },
  });

  const switchOrganizationMutation =
    api.organization.switchOrganization.useMutation({
      onSuccess: () => {
        utils.invalidate();
        toast.success("Switched organization successfully");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to switch organization");
      },
    });

  const createOrganizationMutation =
    api.organization.createOrganization.useMutation({
      onSuccess: () => {
        utils.invalidate();
        toast.success("Created organization successfully");
        setIsCreateOrgDialogOpen(false);
        setNewOrgName("");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create organization");
      },
    });

  const handleCreateOrganization = () => {
    if (!newOrgName.trim()) {
      toast.error("Organization name is required");
      return;
    }
    createOrganizationMutation.mutate({ name: newOrgName.trim() });
  };

  const acceptInvitationMutation =
    api.organization.acceptInvitation.useMutation({
      onSuccess: () => {
        utils.invalidate();
        toast.success("Accepted invitation successfully");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to accept invitation");
      },
    });

  const declineInvitationMutation =
    api.organization.declineInvitation.useMutation({
      onSuccess: () => {
        utils.me.get.invalidate();
        toast.success("Declined invitation");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to decline invitation");
      },
    });

  const user = {
    name: me?.name || "User",
    email: me?.email || "",
    avatar: "", // You can add avatar URL here if available
  };

  const organizationName = me?.organization?.name || "No Organization";
  const hasPendingInvites = (me?.pendingInvitations?.length ?? 0) > 0;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getFallbackAvatar(me?.name, me?.email)}
                    </AvatarFallback>
                  </Avatar>
                  {hasPendingInvites && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                    </span>
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="relative">
                    <span className="truncate font-medium">
                      {organizationName}
                    </span>
                    <LoadingBlur loading={isLoading} showCenter={false} />
                  </div>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto h-4 w-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getFallbackAvatar(me?.name, me?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <div className="relative">
                      <span className="truncate font-medium">
                        {organizationName}
                      </span>
                      <LoadingBlur loading={isLoading} showCenter={false} />
                    </div>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center">
                  Organizations
                  {hasPendingInvites && (
                    <span className="ml-2 flex h-2 w-2">
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                  )}
                </DropdownMenuLabel>
                {me?.userOrganizations && me.userOrganizations.length > 0 ? (
                  me.userOrganizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() =>
                        switchOrganizationMutation.mutate({
                          organizationId: org.id,
                        })
                      }
                      className="cursor-pointer gap-2"
                    >
                      {me.organization?.id === org.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="w-4" />
                      )}
                      {org.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No organizations</DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setIsCreateOrgDialogOpen(true)}
                  className="cursor-pointer gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Organization
                </DropdownMenuItem>
                {me?.pendingInvitations && me.pendingInvitations.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="flex items-center">
                      Pending Invites
                      <span className="ml-2 flex h-2 w-2">
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                      </span>
                    </DropdownMenuLabel>
                    {me.pendingInvitations.map((invite) => (
                      <div key={invite.id} className="px-2 py-2">
                        <div className="text-sm font-medium">
                          {invite.organization.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          From: {invite.user.name}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() =>
                              acceptInvitationMutation.mutate({
                                invitationId: invite.id,
                              })
                            }
                            className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              declineInvitationMutation.mutate({
                                invitationId: invite.id,
                              })
                            }
                            className="flex-1 rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <Link href="/app/settings/account">
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Account
                  </DropdownMenuItem>
                </Link>
                <Link href="/app/settings/billing">
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                </Link>
                {me?.role === "admin" && (
                  <Link href="/app/admin">
                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <Shield className="h-4 w-4" />
                      Admin
                    </DropdownMenuItem>
                  </Link>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => signOutMutation.mutate()}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog
        open={isCreateOrgDialogOpen}
        onOpenChange={setIsCreateOrgDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Enter a name for your new organization. You will be the owner.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateOrganization();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOrgDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={createOrganizationMutation.isPending}
            >
              {createOrganizationMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getFallbackAvatar(name?: string | null, email?: string | null) {
  const noName = !name || name === "";

  const userName = noName ? (email ? email : "") : name;

  // Get the first initial of the first word, and last initial of the last word:
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("");

  if (initials.length > 1 && initials.length <= 3) {
    return initials;
  }

  return userName.slice(0, 2);
}
