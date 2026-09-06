"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The header nav. It is a client component only because the active state reads
// the current path; nothing else here holds state. usePathname is safe outside a
// Suspense boundary, unlike useSearchParams.

const links = [
  { href: "/", label: "Overview" },
  { href: "/close", label: "Close queue" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    // Three links, all one or two words, so they stay laid out as links at every
    // width. A drawer would put a tap and an animation in front of "Close queue"
    // on the one device a judge is most likely to open the demo on. flex-wrap is
    // the small-screen behaviour instead: at 360px the row wraps rather than
    // pushing the header sideways.
    <nav
      aria-label="Primary"
      className="flex flex-wrap items-center justify-end gap-3 text-sm sm:gap-5"
    >
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center underline-offset-4 hover:underline",
              active
                ? "text-ink underline decoration-seal decoration-2"
                : "text-muted-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <a
        href="https://github.com/mericcintosun/obiter"
        className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:underline"
      >
        Source
      </a>
    </nav>
  );
}
