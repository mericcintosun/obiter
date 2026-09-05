"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Nothing off the error object is printed here: not the message, not the digest,
// not a stack. A controller cannot act on any of it, and a close screen is not
// the place to leak the shape of the server. The detail is in the server log.

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[68ch] px-5 py-24">
      <p className="obiter-label">Obiter</p>
      <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.4rem)] leading-tight">
        This screen did not finish loading
      </h1>
      <p className="mt-5 leading-relaxed">
        Nothing was written and nothing was closed. No precedent was applied and no record
        changed state, so retrying is safe. If it fails a second time, go back to the close
        queue and the seed will render from the start.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Try this screen again</Button>
        <Button asChild variant="outline">
          <Link href="/close">Back to the close queue</Link>
        </Button>
      </div>
    </div>
  );
}
