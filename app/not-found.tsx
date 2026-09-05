import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[68ch] px-5 py-24">
      <p className="obiter-label">Obiter</p>
      <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.4rem)] leading-tight">
        There is no page at this address
      </h1>
      <p className="mt-5 leading-relaxed">
        Obiter has two screens: the overview at the root, and the close queue where the work
        happens. Exception ids and precedent ids are not addresses, they are records inside the
        queue, so open the queue and find the record there.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/close">Open the close queue</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Read the overview</Link>
        </Button>
      </div>
    </div>
  );
}
