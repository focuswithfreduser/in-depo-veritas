"use client";

import Image from "next/image";
import { ArrowDown } from "lucide-react";

export function AuthTestimonials() {
  return (
    <div className="hidden flex-1 flex-col justify-center bg-slate-900 p-8 dark:bg-slate-50 lg:flex">
      <div className="mx-auto w-full max-w-md space-y-8">
        {/* Input Image */}
        <div className="flex justify-center">
          <div className="relative w-1/2">
            <Image
              src="/proof/one-page-in.png"
              alt="Input"
              width={400}
              height={300}
              className="rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* Arrow pointing down */}
        <div className="flex justify-center">
          <ArrowDown className="h-8 w-8 text-slate-50 dark:text-slate-900" />
        </div>

        {/* Output Image */}
        <div className="flex justify-center">
          <div className="relative w-full">
            <Image
              src="/proof/one-page-out.png"
              alt="Output"
              width={500}
              height={400}
              className="rounded-lg shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
