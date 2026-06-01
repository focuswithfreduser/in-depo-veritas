import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="Logo" width={32} height={32} />
      <span className="text-2xl font-bold">In Depo Veritas</span>
    </div>
  );
}
