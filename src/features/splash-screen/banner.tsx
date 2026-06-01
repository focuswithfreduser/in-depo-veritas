import Link from "next/link";

export default function Banner() {
  return (
    <div className="flex items-center gap-x-6 bg-yellow px-6 py-2.5 font-sans text-black sm:px-3.5 sm:before:flex-1">
      <p className="text-sm font-medium leading-6	">
        <Link href={"/login"}>
          Are you ready to Simplify the Legal Hustle with AI muscle? Get started
          today!
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </p>
      <div className="flex flex-1 justify-end">
        {/* <button
          type="button"
          className="-m-3 p-3 focus-visible:outline-offset-[-4px]"
          onClick={() => setIsDismissed(true)}
        >
          <span className="sr-only">Dismiss</span>
          <XMarkIcon className="h-5 w-5 text-white" aria-hidden="true" />
        </button> */}
      </div>
    </div>
  );
}
