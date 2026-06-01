"use client";

import { api } from "@/trpc/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow, addMonths, format } from "date-fns";
import { cn } from "@/lib/utils";

interface OrganizationSheetProps {
  organizationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationSheet({
  organizationId,
  open,
  onOpenChange,
}: OrganizationSheetProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | undefined>(undefined);
  const [dateExtensionMode, setDateExtensionMode] = useState<
    "picker" | "quick"
  >("quick");
  const [quickDateOption, setQuickDateOption] = useState<"1" | "2" | "6">("1");
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [quickCreditOption, setQuickCreditOption] = useState<
    "10" | "20" | "100" | "custom"
  >("10");
  const utils = api.useUtils();

  const { data: organization, isLoading } = api.admin.getOrganization.useQuery(
    { id: organizationId! },
    { enabled: !!organizationId && open },
  );

  const toggleFreeForeverMutation = api.admin.toggleFreeForever.useMutation({
    async onSuccess() {
      await utils.admin.getOrganization.invalidate({ id: organizationId! });
      setConfirmDialogOpen(false);
    },
  });

  const extendTrialMutation = api.admin.extendTrial.useMutation({
    async onSuccess() {
      await utils.admin.getOrganization.invalidate({ id: organizationId! });
      setExtendTrialDialogOpen(false);
      setTrialEndDate(undefined);
      setCreditAmount("");
      setQuickCreditOption("10");
      setQuickDateOption("1");
    },
  });

  const handleToggleFreeForever = () => {
    if (organizationId) {
      toggleFreeForeverMutation.mutate({ id: organizationId });
    }
  };

  const handleExtendTrial = () => {
    if (!organizationId) return;

    let finalEndDate: Date;
    if (dateExtensionMode === "picker" && trialEndDate) {
      finalEndDate = trialEndDate;
    } else {
      // If no trial exists, start from now; otherwise extend from current end date
      const baseDate = organization?.organizationStatus.trial
        ? new Date(organization.organizationStatus.trial.endsAt)
        : new Date();
      const monthsToAdd = parseInt(quickDateOption);
      finalEndDate = addMonths(baseDate, monthsToAdd);
    }

    const finalCredits =
      quickCreditOption === "custom"
        ? parseInt(creditAmount) ||
          organization?.organizationStatus.trial?.creditsAvailable ||
          0
        : parseInt(quickCreditOption);

    extendTrialMutation.mutate({
      id: organizationId,
      endsAt: finalEndDate,
      creditsAvailable: finalCredits,
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Organization Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : organization ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Name
                  </h3>
                  <p className="mt-1 text-lg">{organization.name}</p>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Organization Status
                  </h3>
                  <div className="space-y-3">
                    {organization.organizationStatus.type ===
                      "subscription" && (
                      <div className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="default">Subscription</Badge>
                          <Badge
                            variant={
                              organization.organizationStatus.subscription!
                                .status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {
                              organization.organizationStatus.subscription!
                                .status
                            }
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Period:{" "}
                            </span>
                            {new Date(
                              organization.organizationStatus.subscription!.periodStart,
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              organization.organizationStatus.subscription!.periodEnd,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                        {organization.organizationStatus.subscription!
                          .status === "canceled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => setExtendTrialDialogOpen(true)}
                          >
                            {organization.trial
                              ? "Extend Trial"
                              : "Add Free Trial"}
                          </Button>
                        )}
                      </div>
                    )}

                    {organization.organizationStatus.type ===
                      "free_forever" && (
                      <div className="rounded-lg border p-3">
                        <Badge variant="default">Free Forever</Badge>
                        <p className="mt-2 text-sm text-muted-foreground">
                          This organization has unlimited access
                        </p>
                      </div>
                    )}

                    {organization.organizationStatus.type === "trial" && (
                      <div className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge
                            variant={
                              organization.organizationStatus.trial!.hasEnded
                                ? "destructive"
                                : "default"
                            }
                          >
                            Trial{" "}
                            {organization.organizationStatus.trial!.hasEnded
                              ? "(Ended)"
                              : "(Active)"}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              {organization.organizationStatus.trial!.hasEnded
                                ? "Ended: "
                                : "Ends: "}
                            </span>
                            {new Date(
                              organization.organizationStatus.trial!.endsAt,
                            ).toLocaleDateString()}
                            <span className="ml-1 text-muted-foreground">
                              (
                              {formatDistanceToNow(
                                new Date(
                                  organization.organizationStatus.trial!.endsAt,
                                ),
                                { addSuffix: true },
                              )}
                              )
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Credits:{" "}
                            </span>
                            {organization.organizationStatus.trial!.creditsUsed}{" "}
                            /{" "}
                            {
                              organization.organizationStatus.trial!
                                .creditsAvailable
                            }{" "}
                            used
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => setExtendTrialDialogOpen(true)}
                        >
                          Extend Trial
                        </Button>
                      </div>
                    )}

                    {organization.organizationStatus.type === "none" &&
                      organization.trial && (
                        <div className="rounded-lg border p-3">
                          <Badge variant="secondary">No Active Status</Badge>
                          <p className="mt-2 text-sm text-muted-foreground">
                            No subscription or free forever status
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => setExtendTrialDialogOpen(true)}
                          >
                            Extend Trial
                          </Button>
                        </div>
                      )}

                    {organization.organizationStatus.type === "none" &&
                      !organization.trial && (
                        <div className="rounded-lg border p-3">
                          <Badge variant="secondary">No Active Status</Badge>
                          <p className="mt-2 text-sm text-muted-foreground">
                            No subscription, trial, or free forever status
                          </p>
                        </div>
                      )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                    Free Forever Control
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      {organization.freeForever ? "Enabled" : "Disabled"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDialogOpen(true)}
                    >
                      Toggle Free Forever
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Organization not found
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Toggle Free Forever</DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {organization?.freeForever ? "disable" : "enable"} free forever
              for "{organization?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleToggleFreeForever}
              disabled={toggleFreeForeverMutation.isPending}
            >
              {toggleFreeForeverMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={extendTrialDialogOpen}
        onOpenChange={setExtendTrialDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Trial</DialogTitle>
            <DialogDescription>
              Extend the trial period and adjust credits for "
              {organization?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">Trial End Date</Label>
              <RadioGroup
                value={dateExtensionMode}
                onValueChange={(v) =>
                  setDateExtensionMode(v as "picker" | "quick")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quick" id="quick-date" />
                  <Label htmlFor="quick-date" className="font-normal">
                    Quick extend
                  </Label>
                </div>
                {dateExtensionMode === "quick" && (
                  <div className="ml-6 space-y-2">
                    <RadioGroup
                      value={quickDateOption}
                      onValueChange={(v) =>
                        setQuickDateOption(v as "1" | "2" | "6")
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="1-month" />
                        <Label htmlFor="1-month" className="font-normal">
                          Add 1 month
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="2" id="2-months" />
                        <Label htmlFor="2-months" className="font-normal">
                          Add 2 months
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="6" id="6-months" />
                        <Label htmlFor="6-months" className="font-normal">
                          Add 6 months
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="picker" id="picker-date" />
                  <Label htmlFor="picker-date" className="font-normal">
                    Choose exact date
                  </Label>
                </div>
                {dateExtensionMode === "picker" && (
                  <div className="ml-6">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !trialEndDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {trialEndDate ? (
                            format(trialEndDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={trialEndDate}
                          onSelect={setTrialEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Credits</Label>
              <RadioGroup
                value={quickCreditOption}
                onValueChange={(v) =>
                  setQuickCreditOption(v as "10" | "20" | "100" | "custom")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="10" id="10-credits" />
                  <Label htmlFor="10-credits" className="font-normal">
                    10 credits
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="20" id="20-credits" />
                  <Label htmlFor="20-credits" className="font-normal">
                    20 credits
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="100" id="100-credits" />
                  <Label htmlFor="100-credits" className="font-normal">
                    100 credits
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom-credits" />
                  <Label htmlFor="custom-credits" className="font-normal">
                    Custom amount
                  </Label>
                </div>
                {quickCreditOption === "custom" && (
                  <div className="ml-6">
                    <Input
                      type="number"
                      placeholder="Enter credit amount"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      min={
                        organization?.organizationStatus.trial?.creditsUsed || 0
                      }
                    />
                  </div>
                )}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendTrialDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtendTrial}
              disabled={
                extendTrialMutation.isPending ||
                (dateExtensionMode === "picker" && !trialEndDate)
              }
            >
              {extendTrialMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extending...
                </>
              ) : (
                "Extend Trial"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
