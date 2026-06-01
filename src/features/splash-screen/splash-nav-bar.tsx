"use client";

import Image from "next/image";
import Link from "next/link";
import { Disclosure } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

import { NAV_ITEMS } from "@/components/nav-items";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function SplashNavBar() {
  return (
    <Disclosure as="nav" className="">
      {({ open }) => (
        <>
          <div className="mx-auto mt-2 px-2 sm:px-6 lg:px-8">
            <div className="relative  flex items-center justify-between">
              <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                {/* Mobile menu button*/}
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
              <div className="flex flex-1 items-center justify-between align-middle ">
                <div className="flex flex-shrink-0 items-center">
                  <Image
                    src="/logo-web.png"
                    priority
                    alt="logo"
                    width={142}
                    height={100}
                    className="object-contain align-top"
                  />
                </div>
                <div className="hidden justify-center self-center align-middle sm:ml-6 sm:flex ">
                  <div className="flex space-x-4">
                    {NAV_ITEMS.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="rounded-md px-3  py-2 text-xl font-medium text-white hover:text-yellow hover:underline"
                        aria-current={item.current ? "page" : undefined}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={classNames(
                    item.current
                      ? "bg-gray-900 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    "block rounded-md px-3 py-2 text-base font-medium",
                  )}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
