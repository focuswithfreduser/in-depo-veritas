export default function Footer() {
  return (
    <footer className="mt-24 border-t border-gray-800 py-12">
      <div className="mx-auto max-w-[1200px] px-6 text-center text-gray-400">
        <p>
          &copy; {new Date().getFullYear()} In Depo Veritas. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
