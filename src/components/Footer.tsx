import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-stone-600 sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} Rishta Bureau. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/about-us" className="hover:text-rose-700">About Us</Link>
          <Link href="/terms-and-conditions" className="hover:text-rose-700">Terms &amp; Conditions</Link>
          <Link href="/privacy-policy" className="hover:text-rose-700">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
