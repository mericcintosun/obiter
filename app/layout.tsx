import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google";
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
  metadataBase: new URL("https://obiter.vercel.app"),
  title: "Obiter, a case reporter for the month-end close",
  description:
    "The controller resolves one reconciliation exception. Obiter compiles that decision into a named rule and closes every matching exception in the queue, with the precedent stamped on each record and one click to revert.",
  openGraph: {
    title: "Obiter, a case reporter for the month-end close",
    description:
      "Resolve one reconciliation exception. Obiter compiles the decision into a named rule and applies it to the rest of the queue.",
    type: "website",
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
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/close" className="underline-offset-4 hover:underline">
                Close queue
              </Link>
              <a
                href="https://github.com/"
                className="text-muted-foreground underline-offset-4 hover:underline"
              >
                Source
              </a>
            </nav>
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
          </div>
        </footer>
      </body>
    </html>
  );
}
