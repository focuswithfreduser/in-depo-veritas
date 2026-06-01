import Footer from "@/components/footer";
import Banner from "./banner";
import Faq from "./faq";
import GetStartedToday from "./get-started-today";
import Home from "./home";
import SplashNavBar from "./splash-nav-bar";
import WhatWeHaveBuilt from "./what-we-have-built";

export default function Splash() {
  return (
    <div className="bg-black text-white">
      <a id="home" />
      <Banner />
      <div className="relative mx-auto w-full max-w-[1200px] 2xl:max-w-[1600px]">
        <SplashNavBar />
        <div className="flex flex-col gap-y-24">
          <Home />
          <WhatWeHaveBuilt />
          <Faq />
          <GetStartedToday />
        </div>
      </div>
      <Footer />
    </div>
  );
}
