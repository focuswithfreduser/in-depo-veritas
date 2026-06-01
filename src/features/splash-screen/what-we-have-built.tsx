"use client";
import Link from "next/link";

import { FadeIn } from "@/components/fade-in";
import { Container } from "./container";
import { List, ListItem } from "./list-item";
import { SectionIntro } from "./section-intro";
import { StylizedImage } from "./stylized-image";
import GetStarted from "./get-started-button";

export default function WhatWeHaveBuilt() {
  return (
    <FadeIn>
      <a id="system"></a>
      <SectionIntro
        // eyebrow="Services"
        title="What we have built"
        className="text-white sm:mt-32 lg:mt-40"
      >
        <p className="text-white">
          We’ve developed a reputation for infusing science and technology into
          the law. So, when ChatGPT and other natural language processing AI was
          released to the world, we got to work.
        </p>
      </SectionIntro>
      <Container className="mt-16">
        <div className="lg:flex lg:items-center lg:justify-end">
          <div className="flex justify-center lg:w-1/2 lg:justify-end lg:pr-12">
            <FadeIn className="w-[33.75rem] flex-none lg:w-[45rem]">
              <StylizedImage
                src={"/laptop.jpg"}
                sizes="(min-width: 1024px) 41rem, 31rem"
                className="justify-center lg:justify-end"
              />
            </FadeIn>
          </div>
          <List className="mt-16 lg:mt-0 lg:w-1/2 lg:min-w-[33rem] lg:pl-4">
            <ListItem>
              While many were working on Swiss-army-knife type applications, we
              were working to build one powerful, precise tool: an AI powered
              site that can summarize depositions (and soon, many other legal
              documents).
            </ListItem>
            <ListItem>
              We hired a talented and experienced developer to help us make it
              happen. The result is an easy-to-use site that can save attorneys
              hundreds of hours and tens of thousands of dollars.
            </ListItem>
          </List>
        </div>
      </Container>
      <Container className="mb-60 text-center">
        <GetStarted />
      </Container>
    </FadeIn>
  );
}
