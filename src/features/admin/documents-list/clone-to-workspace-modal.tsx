"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api } from "@/trpc/react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

interface CloneToWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDocumentIds: string[];
  selectedDocuments?: Array<{
    id: string;
    fileName: string | null;
    organization: { name: string } | null;
  }>;
  onCloneComplete?: () => void;
}

type UserWithOrganization = {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
};

export function CloneToWorkspaceModal({
  open,
  onOpenChange,
  selectedDocumentIds,
  selectedDocuments,
  onCloneComplete,
}: CloneToWorkspaceModalProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: users, isLoading } =
    api.admin.listUsersWithOrganizations.useQuery();

  const utils = api.useContext();

  const cloneDocuments = api.admin.cloneDocumentsToWorkspace.useMutation({
    onSuccess: async (data) => {
      await utils.admin.listFiles.invalidate();
      toast.success(
        `Successfully cloned ${data.clonedCount} document${
          data.clonedCount !== 1 ? "s" : ""
        }`,
      );
      setSelectedOrgId(null);
      setShowConfirmation(false);
      onOpenChange(false);
      onCloneComplete?.();
    },
    onError: (error) => {
      toast.error(`Failed to clone documents: ${error.message}`);
    },
  });

  // Flatten users with their organizations
  const userOrgPairs = useMemo<UserWithOrganization[]>(() => {
    if (!users) return [];

    const pairs: UserWithOrganization[] = [];
    users.forEach((user) => {
      user.members.forEach((member) => {
        pairs.push({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          organizationId: member.organization.id,
          organizationName: member.organization.name,
        });
      });
    });
    return pairs;
  }, [users]);

  const handleSelect = (organizationId: string) => {
    setSelectedOrgId(organizationId);
  };

  const handleOk = () => {
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (!selectedOrgId) return;

    cloneDocuments.mutate({
      documentIds: selectedDocumentIds,
      targetOrganizationId: selectedOrgId,
    });
  };

  const handleCancel = () => {
    setSelectedOrgId(null);
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  const selectedPair = userOrgPairs.find(
    (pair) => pair.organizationId === selectedOrgId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle>Clone to Workspace</DialogTitle>
              <DialogDescription>
                Select the user/workspace where you want to clone{" "}
                {selectedDocumentIds.length} document
                {selectedDocumentIds.length !== 1 ? "s" : ""}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Command className="rounded-lg border" shouldFilter={true}>
                <CommandInput placeholder="Search by user name, email, or organization..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {isLoading ? (
                      <div className="py-6 text-center text-sm">
                        Loading users...
                      </div>
                    ) : (
                      userOrgPairs.map((pair) => {
                        const uniqueKey = `${pair.userId}-${pair.organizationId}`;
                        const isSelected =
                          selectedOrgId === pair.organizationId;
                        const searchValue = `${pair.userName} ${pair.userEmail} ${pair.organizationName}`;
                        return (
                          <CommandItem
                            key={uniqueKey}
                            value={searchValue}
                            onSelect={() => handleSelect(pair.organizationId)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-1 items-center gap-3">
                              <div
                                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                                  isSelected
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground"
                                }`}
                              >
                                {isSelected && (
                                  <div className="h-2 w-2 rounded-full bg-white" />
                                )}
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-medium">
                                    {pair.userName}
                                  </span>
                                  <span className="truncate text-xs text-muted-foreground">
                                    ({pair.userEmail})
                                  </span>
                                </div>
                                <span className="truncate text-xs text-muted-foreground">
                                  {pair.organizationName}
                                </span>
                              </div>
                            </div>
                          </CommandItem>
                        );
                      })
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
              {selectedOrgId && (
                <div className="mt-4 text-sm text-muted-foreground">
                  1 workspace selected
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleOk} disabled={!selectedOrgId}>
                OK
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-destructive">
                ⚠️ CRITICAL WARNING - READ CAREFULLY
              </DialogTitle>
              <DialogDescription className="space-y-3 text-base">
                <p className="font-bold text-destructive">
                  You are about to copy {selectedDocumentIds.length} deposition
                  {selectedDocumentIds.length !== 1 ? "s" : ""} into another
                  customer&apos;s workspace.
                </p>
                <p className="font-semibold">
                  This action could expose confidential client information to
                  the wrong party if done incorrectly.
                </p>
                <p className="font-semibold">Before proceeding, you MUST:</p>
                <ul className="list-disc space-y-1 pl-6 font-medium">
                  <li>VERIFY you have selected the correct target workspace</li>
                  <li>
                    REVIEW that the documents belong to this customer or are
                    appropriate for them to receive
                  </li>
                  <li>
                    CONFIRM you are not accidentally mixing up different
                    customers&apos; depositions
                  </li>
                  <li>DOUBLE-CHECK all details before clicking Confirm</li>
                </ul>
                <p className="font-bold text-destructive">
                  Mixing customer data is a serious breach of confidentiality.
                  Take the time to verify everything now.
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold">
                  Documents to be cloned:
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border bg-muted/50 p-3">
                  {selectedDocuments && selectedDocuments.length > 0 ? (
                    selectedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded border bg-background p-2 text-sm"
                      >
                        <div className="truncate font-medium">
                          {doc.fileName || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current workspace:{" "}
                          {doc.organization?.name || "Unknown"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {selectedDocumentIds.length} document
                      {selectedDocumentIds.length !== 1 ? "s" : ""} selected
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">Target workspace:</div>
                {selectedPair && (
                  <div className="rounded-md border-2 border-destructive bg-destructive/10 p-3 text-sm">
                    <div className="font-medium">{selectedPair.userName}</div>
                    <div className="text-muted-foreground">
                      {selectedPair.organizationName}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={cloneDocuments.isPending}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                variant="destructive"
                disabled={cloneDocuments.isPending}
              >
                {cloneDocuments.isPending
                  ? "Cloning..."
                  : "I have verified everything - Confirm"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
