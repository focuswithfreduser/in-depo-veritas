import { Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function NoNewUsersBanner() {
  return (
    <Alert className="bg-muted/50">
      <Info className="h-4 w-4" />
      <AlertDescription>
        In Depo Veritas is no longer accepting new users.{" "}
        <Link
          href="mailto:support@indepoveritas.com"
          className="underline hover:text-foreground"
        >
          Get in touch
        </Link>{" "}
        to learn more.
      </AlertDescription>
    </Alert>
  );
}
