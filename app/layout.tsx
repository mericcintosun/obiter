import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const display = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
});

const body = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  // The deployed host, not the project name. Every relative metadata URL is
  // resolved against this, including the og:image that app/opengraph-image.png
  // produces by file convention, so a wrong host here is a 404 in the card.
  metadataBase: new URL("https://obiter-app.vercel.app"),
  title: {
    default: "Obiter, a case reporter for the month-end close",
    template: "%s | Obiter",
  },
  description:
    "The controller resolves one reconciliation exception. Obiter compiles that decision into a named rule and closes every matching exception in the queue, with the precedent stamped on each record and one click to revert.",
  openGraph: {
    title: "Obiter, a case reporter for the month-end close",
    description:
      "Resolve one reconciliation exception. Obiter compiles the decision into a named rule and applies it to the rest of the queue.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Obiter, a case reporter for the month-end close",
    description:
      "Resolve one reconciliation exception. Obiter compiles the decision into a named rule and applies it to the rest of the queue.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-border bg-ground">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/brand/logo.png"
                alt=""
                width={26}
                height={26}
                priority
                className="h-[26px] w-[26px] object-contain"
              />
              <span className="font-display text-lg tracking-tight">Obiter</span>
            </Link>
            <SiteNav />
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-border">
          <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-muted-foreground">
            <p>
              Obiter. Built for the Syndicate by Maximor hackathon, Track 2, Autonomous Office of
              the CFO. Seed data is a fictional August 2026 close for a company called Halden
              Analytics.
            </p>
            <p className="mt-3">
              Source at{" "}
              <a
                href="https://github.com/mericcintosun/obiter"
                className="underline underline-offset-4"
              >
                github.com/mericcintosun/obiter
              </a>
              , and what this app touches is written out in{" "}
              <a
                href="https://github.com/mericcintosun/obiter/blob/main/SECURITY.md"
                className="underline underline-offset-4"
              >
                SECURITY.md
              </a>
              . The close on screen is fictional, and Obiter stores no customer records and no
              payment data of its own.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
