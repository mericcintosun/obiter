import { cn } from "@/lib/utils";

// The measured result of the close that is on screen right now.
//
// Every number here is already computed in components/close-queue.tsx from the
// same state the queue renders, so this component recomputes nothing and holds
// nothing. It takes numbers and prints them. That is why it needs no
// "use client" directive of its own: it has no hooks, no handlers and no fetch,
// and it inherits the client boundary from its only importer.

interface Props {
  /** Exceptions the matcher raised, seed plus anything pulled since. */
  raised: number;
  /** Closures carried in from June and July, before this close was opened. */
  baselineClosures: number;
  /** The autonomy rate those carried closures produced, as a percent. */
  baselineAutonomy: number;
  /** Closures with no human on the record, carried plus written today. */
  autonomousClosures: number;
  /** The autonomy rate now, as a percent. */
  autonomy: number;
  /** Records a human decided on this close. */
  humanTouches: number;
  /** Exceptions still waiting for a human. */
  openCount: number;
  /** How many were waiting when the close was opened. */
  seededOpenCount: number;
  /** Precedents compiled and applied during this close. */
  precedentsWrittenToday: number;
}

interface Row {
  label: string;
  before: string;
  now: string;
  /** True when the right column is better than the left one. */
  improved: boolean;
  /** True when nothing has moved on this line yet. */
  unchanged: boolean;
}

export function CloseMeasures({
  raised,
  baselineClosures,
  baselineAutonomy,
  autonomousClosures,
  autonomy,
  humanTouches,
  openCount,
  seededOpenCount,
  precedentsWrittenToday,
}: Props) {
  const rows: Row[] = [
    {
      label: "Open exceptions needing a human",
      before: String(seededOpenCount),
      now: String(openCount),
      improved: openCount < seededOpenCount,
      unchanged: openCount === seededOpenCount,
    },
    {
      label: "Records closed with no human looking at them",
      before: `${baselineClosures} of ${raised}`,
      now: `${autonomousClosures} of ${raised}`,
      improved: autonomousClosures > baselineClosures,
      unchanged: autonomousClosures === baselineClosures,
    },
    {
      label: "Autonomy",
      before: `${baselineAutonomy} percent`,
      now: `${autonomy} percent`,
      improved: autonomy > baselineAutonomy,
      unchanged: autonomy === baselineAutonomy,
    },
    {
      // A human touch is the cost side of the ledger, so this line never turns
      // green. It is here because one touch buying six closures is the whole
      // claim, and the claim is only checkable if the touches are counted too.
      label: "Human touches",
      before: "0",
      now: String(humanTouches),
      improved: false,
      unchanged: humanTouches === 0,
    },
  ];

  return (
    <section id="measures" className="mt-10 scroll-mt-20">
      <p className="obiter-label">Measured result, this close</p>
      <h2 className="mt-2 max-w-full text-2xl">What has changed while you watched</h2>

      <div className="mt-6">
        <div className="obiter-rule hidden gap-4 pb-2 sm:flex">
          <span className="obiter-label flex-1">Line</span>
          <span className="obiter-label w-[8rem] max-w-full shrink-0 text-right">
            At the start
          </span>
          <span className="obiter-label w-[8rem] max-w-full shrink-0 text-right">Now</span>
        </div>

        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className="obiter-rule flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3"
            >
              <dt className="w-full text-sm leading-relaxed sm:w-auto sm:flex-1">{row.label}</dt>
              {/* Under sm the column headings are hidden and the two figures sit
                  side by side under the label, so each one carries its own
                  heading inline. The row reflows rather than scrolling. */}
              <dd className="obiter-figure w-[8rem] max-w-full shrink-0 text-left text-muted-foreground sm:text-right">
                <span className="obiter-label mr-2 sm:hidden">At the start</span>
                {row.before}
              </dd>
              <dd
                className={cn(
                  "obiter-figure w-[8rem] max-w-full shrink-0 text-left font-medium sm:text-right",
                  row.improved ? "text-second" : row.unchanged ? "text-muted-foreground" : "text-ink"
                )}
              >
                <span className="obiter-label mr-2 sm:hidden">Now</span>
                {row.now}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {precedentsWrittenToday === 0 ? (
        <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          Nothing has moved yet. Both columns read the same because no precedent has been written
          in this close. Compile one from an exception below and apply it, and every number in the
          right column moves.
        </p>
      ) : (
        <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          {precedentsWrittenToday === 1
            ? "One precedent written in this close, applied to the queue below."
            : `${precedentsWrittenToday} precedents written in this close, applied to the queue below.`}{" "}
          Reverting one puts the right column back where the left column is.
        </p>
      )}
    </section>
  );
}
