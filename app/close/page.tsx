import type { Metadata } from "next";
import { CloseQueue } from "@/components/close-queue";
import { getCloseState } from "@/lib/adapters";

export const metadata: Metadata = {
  title: "Close queue, August 2026",
  description:
    "24 open reconciliation exceptions. Resolve one and Obiter compiles the decision into a named rule, then applies it to the rest of the queue.",
};

// The journal is read per request. Without this the close would be captured at
// build time and a reload would show the state the build machine saw.
export const dynamic = "force-dynamic";

export default async function ClosePage() {
  const { summary, carried, open, journal } = await getCloseState();

  // `open` is the seed queue with persisted settlements appended. The client
  // keeps those two apart, because "how many exceptions were raised" counts the
  // arrivals and "what does the seed look like" does not.
  const liveIds = new Set(journal.live.map((exception) => exception.id));
  const seeded = open.filter((exception) => !liveIds.has(exception.id));

  return (
    <CloseQueue
      initialQueue={seeded}
      summary={summary}
      carried={carried}
      initialPrecedents={journal.precedents}
      initialClosures={journal.closures}
      initialLive={journal.live}
      initialSequence={journal.sequence}
    />
  );
}
