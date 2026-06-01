"use client";

import { api } from "@/trpc/react";
import { TeamTable } from "./team-table";
import { InviteTeamMemberDialog } from "./invite-team-member-dialog";
import { EditOrganizationNameDialog } from "./edit-organization-name-dialog";
import { HelpBox } from "@/components/help-box";

export default function TeamPage() {
  const { data: teamMembers, isLoading } =
    api.organization.listTeamMembers.useQuery();
  const { data: me } = api.me.get.useQuery();

  if (isLoading || !me) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Team</h3>
            <p className="text-sm text-muted-foreground">
              Manage your organization members and invitations.
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Team</h3>
        <HelpBox>
          <p className="font-medium">
            Add as many team members as you need at no additional cost
          </p>
          <p>
            Your organization costs $49.95/month and includes 10 summaries.
            Additional summaries are $4.95 each. Adding users doesn't change
            your price.
          </p>
          <p>
            <span className="font-medium">Important:</span> All members can view
            all depositions within this organization. If you need to keep
            depositions separate, create a new organization for each group.
          </p>
        </HelpBox>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Organization:</span>
          <span className="text-sm">{me.organization?.name || "Unnamed"}</span>
          <EditOrganizationNameDialog
            currentName={me.organization?.name || ""}
          />
        </div>
        <InviteTeamMemberDialog />
      </div>
      <TeamTable data={teamMembers || []} currentUserId={me.id} />
    </div>
  );
}
