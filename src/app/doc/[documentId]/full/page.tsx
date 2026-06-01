import { WebView } from "@/features/admin/view/web-view";
import { api } from "@/trpc/server";

export default async function AdminViewDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;

  const document = await api.admin.getDocument({ id: documentId });
  return <WebView document={document} isFull isPrint={true} />;
}
