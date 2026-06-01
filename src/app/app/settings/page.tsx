import { redirect } from "next/navigation";

export default function SettingsBasePage() {
  return redirect("/app/settings/account");
}
