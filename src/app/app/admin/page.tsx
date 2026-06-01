import { redirect } from "next/navigation";

export default function AdminBasePage() {
  return redirect("/app/admin/users");
}
