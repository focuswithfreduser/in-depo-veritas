import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingCard() {
  return (
    <div className="mt-0 flex w-full flex-col space-y-7">
      <Skeleton className="h-8 w-full rounded-xl" />
      <div className="space-y-5">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
