import Papa from "papaparse";
import { UserAdminView } from "./types";

export function exportUsersToCSV(users: UserAdminView[]) {
  // Generate filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -5); // Format: YYYY-MM-DDTHH-MM-SS
  const filename = `res-ipsa-ai-users-${timestamp}.csv`;

  // Transform the data for CSV export
  const csvData = users.map((user) => ({
    "First Name": user.firstName,
    Name: user.name,
    Email: user.email,
    "Document Count": user._count.documents,
    Organizations: user.members.map((m) => m.organization.name).join("; "),
    "Organization Statuses": user.members
      .map((m) => m.organization.status?.label || "")
      .join("; "),
    "Joined Date": user.createdAt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }),
  }));

  // Convert to CSV
  const csv = Papa.unparse(csvData);

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
