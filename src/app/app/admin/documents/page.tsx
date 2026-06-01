import type { Metadata } from "next";
import DocumentsList from "@/features/admin/documents-list/container";

export const metadata: Metadata = {
  title: "In Depo Veritas Admin Site",
  description:
    "Allow In Depo Veritas Admin users to view and manage the application.",
};

export default function AdminPage() {
  return <DocumentsList />;
}
