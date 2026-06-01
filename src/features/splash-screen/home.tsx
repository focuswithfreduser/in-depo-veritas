"use client";
import Image from "next/image";

import { FadeIn } from "@/components/fade-in";
import GetStarted from "./get-started-button";

const imageClasses =
  "extremely-subtle-bounce my-10 rounded-2xl object-contain align-top opacity-40";

function MainImage({ src }: { src: string }) {
  return (
    <FadeIn duration={null} className="delay-75">
      <Image
        src={src}
        alt="logo"
        width={393}
        height={588}
        className={imageClasses}
      />
    </FadeIn>
  );
}

export default function Home() {
  return (
    <div className="flex flex-row justify-center">
      <MainImage src="/left-hero.jpg" />
      <FadeIn className="mx-8 flex flex-[2_2_0%] flex-col items-center self-center text-center">
        <div className={`big-text font-bebas `}>
          SIMPLIFY THE LEGAL HUSTLE WITH{" "}
          <span className="text-yellow">AI MUSCLE</span>
        </div>
        <div className="mt-2 max-w-[401px] text-center text-[18px] text-white">
          Res Ispa AI saves time and makes money. Summarise depositions with the
          power of AI, using our revolutionary software.
        </div>
        <GetStarted />
      </FadeIn>
      <MainImage src="/ai-chip.jpg" />
    </div>
  );
}
