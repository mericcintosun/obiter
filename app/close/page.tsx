import type { Metadata } from "next";
import { CloseQueue } from "@/components/close-queue";
import { carriedPrecedents, closeSummary, openExceptions } from "@/lib/data";

export const metadata: Metadata = {
  title: "Close queue, August 2026 | Obiter",
  description:
    "24 open reconciliation exceptions. Resolve one and Obiter compiles the decision into a named rule, then applies it to the rest of the queue.",
};

export default function ClosePage() {
  return (
    <CloseQueue
      initialQueue={openExceptions}
      summary={closeSummary}
      carried={carriedPrecedents}
    />
  );
}
