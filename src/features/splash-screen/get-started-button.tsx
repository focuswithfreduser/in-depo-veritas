import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GetStarted({
  text = "Get Started",
}: {
  text?: string;
}) {
  return (
    <Link href={"/login"}>
      <Button
        size="lg"
        className="hover:bg-yellow-500 mt-8 rounded-md bg-yellow p-8 text-xl text-black"
      >
        {text}
      </Button>
    </Link>
  );
}
