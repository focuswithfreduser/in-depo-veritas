import { api } from "@/trpc/server";
import AccountForm from "./account-form";

export default async function SettingsAccountPage() {
  const me = await api.me.get();
  // const { workspaces, domain } =
  //   await api.workspace.getAvailableWorkspacesFromDomain.query();

  return (
    <AccountForm
      availableWorkspaces={[]}
      name={me.name ?? ""}
      firstName={me.firstName ?? ""}
      workspaceName={"workspace"}
      domain={"domain"}
    />
  );
}
