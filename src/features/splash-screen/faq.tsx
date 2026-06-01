"use client";
import React, { useState } from "react";
import Link from "next/link";
import clsx from "clsx";

import { FadeIn } from "@/components/fade-in";

export default function Faq() {
  return (
    <>
      <a id="faq" />
      <FadeIn>
        <div className="w-full bg-muted/30 px-6 py-12">
          <div className="mx-auto max-w-4xl text-center">
            {/* Ship Faster Badge */}
            <div className="mb-2 inline-flex items-center justify-center">
              <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                [ Questions? ]
              </span>
            </div>
            <p className="montserrat text-[32px] "></p>
          </div>
          <div className="animate-fade-in-down ">
            <Accordion />
          </div>
        </div>
      </FadeIn>
    </>
  );
}

interface FAQ {
  question: string;
  answer: React.ReactNode;
  height?: string;
}

const faqs: FAQ[] = [
  // {
  //   question: "How Does Your Pricing Work?",
  //   height: "h-[900px]",
  //   answer: (
  //     <>
  //       <div className="">
  //         <p>
  //           Our pricing is easy. You can pay $50 per month and summarize up to
  //           25 depositions. The price is fixed, so it benefits you to use the
  //           service for all your depositions. More than one person in your firm
  //           can use the account, so if you don’t think you’ll summarize more
  //           than 25 depositions a month, you don’t need more than one account.
  //           If you will summarize more than 25 depositions, you can either by a
  //           pack of 50 when you run out, or you can have multiple accounts for
  //           multiple workers. Either way, adding another 50 depositions is $99.
  //         </p>
  //         <p>
  //           If you have large firm, and anticipate summarizing more than 200
  //           depositions per month, we have discounted pricing available.
  //         </p>
  //         <p>
  //           You can sign up for 100 summaries per month, spread across up to 5
  //           users, for $189 per month. And you can purchase 200 summaries per
  //           month, spread across up to 10 users, for $359 per month.
  //         </p>
  //         <p>
  //           Depositions do not carry over, month to month. So only contract for
  //           the number you are likely to need.
  //         </p>
  //         <p>Your account renews monthly, and you cancel at any time.</p>
  //       </div>
  //     </>
  //   ),
  // },
  {
    question: "What Does a Deposition Summary Look Like?",
    height: "h-[400px]",
    answer: (
      <>
        <div>
          <p>
            As we experimented with summaries, we had to develop software that
            would provide an acceptable level of detail. On average, our
            deposition summaries produce about paragraph of text per deposition
            page. This means that a 100-page deposition is reduced to about 10
            pages. Although many deposition summaries are done by page and line,
            we learned that having a summary that was written in paragraph form
            is much more natural and easier to read. We also learned that if we
            produce summaries that are grouped in 5-page segments, it provides
            the level of detail needed to quickly go to the right spot in the
            full deposition text to then review in detail.
          </p>
          <p>
            The result is that you can quickly learn the contents of a
            deposition, then flip right to the page range that matter for your
            work that day. You can see examples of the summaries{" "}
            <Link href="/examples" className="link">
              here.
            </Link>
          </p>
        </div>
      </>
    ),
  },
  {
    question: "What Can I Expect in Terms of Quality?",
    answer: (
      <div>
        <p>
          AI generates summaries that have no bias. The AI isn’t reading the
          deposition with the history of discovery fights, dislike of a witness,
          or confirmation bias. As a result, AI summaries avoid the bias that
          can influence summaries. That said, AI summaries are not perfect. You
          may read them, then read the deposition, and think you would have
          omitted a detail that the AI included, or that you would have added a
          detail that the AI omitted. Those are limitations of AI, and in
          general, the limitations of people too.
        </p>
        <p>
          The goal of a summary is <span className="underline">not</span> to be
          so detailed you could cite it to a court (after all, citing a summary
          of a deposition is probably malpractice). The goal of a deposition
          summary is to help you know what pages to read carefully and cite, and
          which pages don’t have anything related to what you’re looking for. AI
          summaries, when trained properly and built with the proper code, can
          do that.
        </p>
        <p>
          And we've made it even easier. Read our summary. Find a part that is
          important. Click and go straight to the transcript. 
        </p>
      </div>
    ),
    height: "h-[500px]",
  },
  {
    question: "But Can't I Just do it myself?",
    answer: (
      <div>
        <p>
          You might think, “If you are using AI, can’t I just do it myself?” The
          short answer is, “Yes, you can. But it will take a long time, it won’t
          be great, and it will still cost more than In Depo Veritas.”
        </p>
        <p>
          If you take a whole deposition and dump it in ChatGPT or a similar
          NLP, what will happen? It will error out and tell you that you have
          exceeded the length requirements. ChatGPT can only take so many tokens
          at once (tokens are a weird way they talk about word limits). So, you
          have to cut the text up. But ChatGPT doesn’t count the words the way
          Microsoft Word does. So, even if you cut up the text, it will often
          error again. Once you start cutting the text shorter, you’ll get less
          errors. But ChatGPT, if prompted to summarize, will do it almost too
          well. It will cut it down to a paragraph, and that paragraph doesn’t
          have enough detail to help. So, you’ll play with the detail and the
          prompt to ChatGPT, asking different levels of detail. And then, you’ll
          get a summary of a few pages. Then, when you feed ChatGPT the next few
          pages, it will start to summarize the whole deposition again, not just
          the new part. That’s a problem that can be overcome, but it isn’t
          obvious or easy.
        </p>
        <p>
          These are problems that can be solved, but they require someone who is
          paying attention, and checking the output. And by the time you have
          someone do that work, you could have use In Depo Veritas for less than
          you spent on the time to do the work. Indeed, even if you trained
          someone to do it well, it would still be cheaper to use In Depo
          Veritas. That’s the power of expensive, powerful computer code.
        </p>
        <p>And that is what we invested in building. </p>
      </div>
    ),
    height: "h-[700px]",
  },
  {
    question: "How Will This Help Me Make Money and Save Time?",
    answer: (
      <div>
        <p>
          The current going rate to hire someone to summarize depositions is
          about $2 per page, making a 100-page deposition a $200 cost. Maybe
          you’re thinking, “That’s absurd. I don’t pay anyone. We do it in the
          office.” Ok. Even if you have a paralegal summarize a deposition,
          assuming you pay them a salary that costs you a total of $75,000
          (benefits, taxes, etc.), you are paying about $30 per hour. So, if
          they summarize a 100-page deposition, and do it in two hours, you
          still paid $60 for the summary. If your associate attorneys do the
          work, the cost is even higher (likely at least $120). And if you
          aren’t summarizing depositions at all, and are just reading them all
          yourself, the costs in time and money are truly immense.
        </p>
        <p>
          Our deposition summaries cost $4.95 per summary, regardless of the
          length. So, even a 200-page deposition that would cost you between
          $120 (paralegal) and $400 (outsourcing to a company) will cost you
          $4.95.
        </p>
        <p>
          But you save a lot more than the cost of the deposition. Imagine the
          next time you retain an expert what you’ll save if you can send clean
          summaries of all relevant depositions, with your highlights regarding
          the important parts. Our co-counsel recently received a bill from an
          expert for $55,000, in which 2/3 of it was review of the records. They
          were in a crunch, and so they sent the expert all the depositions and
          most of the file, without much direction. Imagine what they would have
          saved, in that one exchange, if they could have sent AI summaries (no
          claims by the other side these are biased) and been able to direct the
          expert to the content that relates to topics of interest. Paying $20
          for 20 deposition summaries could have saved tens of thousands of
          dollars.
        </p>
        <p>
          Deposition summaries won’t just save you money. They’ll help you make
          it too. This can happen in many ways. Imagine you develop an office
          practice that each time a deposition is taken, when the transcript
          comes in, it is uploaded to In Depo Veritas so you have a clean
          summary. You can send those summaries to clients to keep them in the
          loop. They’ll feel connected and informed, but the time spent for you
          is literally the less than one minute it took to go to the site and
          upload the deposition. Happy clients create referrals, they don’t file
          claims, and they listen when you give advice.
        </p>
        <p>
          There are other almost daily ways In Depo Veritas will help you get
          better results and earn more. Imagine getting ready for summary
          judgment and being able to immediately zero in on the relevant parts
          of the deposition, avoiding the pages of introduction, background,
          irrelevant topics, or tangents. You’ll write better motions, and
          you’ll write them in less time. The same is true for trial prep. No
          attorney should go to trial without a command of every deposition
          taken in the case. That job is made much easier if you can read the
          summaries first, identify the page ranges of importance, and then
          focus on the essential portions.
        </p>
        <p>
          In sum, In Depo Veritas saves time and makes money. It is one powerful
          way to “Simplify the Legal Hustle with AI muscle.”
        </p>
      </div>
    ),
  },
];

const Accordion: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
      {faqs.map((faq, index) => (
        <div key={index} className="">
          <div
            className="mt-0 flex cursor-pointer items-center
            justify-start border-t-2 border-border pt-0 align-middle
            "
            onClick={() => {
              // if it's already active, disable it:
              if (activeIndex === index) {
                setActiveIndex(null);
                return;
              } else {
                setActiveIndex(index);
              }
            }}
          >
            <svg
              className={`${
                activeIndex === index ? "rotate-45 transform text-primary" : ""
              } transition-transform duration-200`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <p
              className={clsx(
                `ml-2 mr-24 p-4 font-bebas  text-[31px] font-normal leading-[37.68px] `,
                activeIndex === index ? "text-black" : "text-black",
              )}
            >
              {faq.question}
            </p>
          </div>
          <div
            className={clsx(
              "montserrat prose max-h-0 overflow-hidden text-[18px] leading-[28px] text-black dark:prose-invert",
              activeIndex === index ? "max-h-[1500px]" : "",
              "transition-all duration-700 ease-in-out ",
            )}
          >
            {faq.answer}
          </div>
        </div>
      ))}
    </div>
  );
};
