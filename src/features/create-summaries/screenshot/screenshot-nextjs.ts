import { api } from "@/trpc/node";

// Reminder: this is used in a trigger task,
// so the "node" TRPC client must be used
export async function screenshotInNext(documentId: string) {
  return api.admin.screenshot.mutate({
    id: documentId,
    isFull: true,
  });
}
