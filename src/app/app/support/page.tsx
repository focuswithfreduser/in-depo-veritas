// There are three options: go to your summaries,
// upload more, or give feedback.

import Link from "next/link";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/server";
// import FeedbackForm from "./components/feedback-form";
import { SUPPORT_EMAIL } from "@/config";

export default async function SupportFeedback() {
  const me = await api.me.get();

  return (
    <>
      <div className="flex flex-col justify-center gap-y-4">
        <h1 className="text-2xl font-semibold">Support & Feedback</h1>
        {/* hi message */}

        <div className="flex flex-col gap-y-4">
          <div className="text-xl ">
            Hi {me.name}, how can we help you today?
          </div>
          <div>A few links:</div>
          <div className="flex flex-row gap-4">
            <Link href="/app">
              <Button variant="outline">Create more summaries</Button>
            </Link>
            {/* update your name */}
            <Link href="/app/settings">
              <Button variant="outline">
                Update your name or organization name
              </Button>
            </Link>
            {/* billing */}
            <Link href="/app/settings/billing">
              <Button variant="outline">Update your billing information</Button>
            </Link>
          </div>
        </div>

        <p className="mt-4 text-lg">
          Let us know if you have any questions or feedback. We're here to help!
        </p>
        <div className="mt-4 flex">
          <CopyToClipboard className="inline">
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
          </CopyToClipboard>
        </div>
        {/* <FeedbackForm /> */}
      </div>
    </>
  );
}
