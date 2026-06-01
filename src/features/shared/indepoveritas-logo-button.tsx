import Link from "next/link";
import Image from "next/image";

export default function InDepoVeritasLogoButton() {
  return (
    <Link
      href="/app/"
      className="flex items-center gap-2 text-lg font-semibold"
    >
      <Image
        alt="In Depo Veritas Company Logo"
        src="/favicon-150x150.png"
        width="30"
        height="30"
      />
      <span>In Depo Veritas</span>
    </Link>
  );
}
