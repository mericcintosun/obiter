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
    <nav aria-label="Primary" className="flex items-center gap-4 text-sm sm:gap-5">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "underline-offset-4 hover:underline",
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
        className="text-muted-foreground underline-offset-4 hover:underline"
      >
        Source
      </a>
    </nav>
  );
}
