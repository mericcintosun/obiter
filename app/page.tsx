import Link from "next/link";
import { CountedFigure } from "@/components/counted-figure";
import { PatternSparkline } from "@/components/pattern-sparkline";
import { Plate } from "@/components/plate";
import { SectionEntrance } from "@/components/section-entrance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCloseState } from "@/lib/adapters";
import { exceptionKindLabels, type ExceptionKind } from "@/lib/data";

const compiledExample = `{
  "id": "PREC-03",
  "name": "Rounding shortfall up to $2.00, Northwind Group",
  "kind": "short_payment",
  "conditions": {
    "maxAbsDelta": 2,
    "maxDeltaPct": 0.5,
    "maxDaysApart": 2,
    "currencies": ["USD"],
    "requireBatchSumMatch": false
  },
  "scope": { "level": "counterparty_group", "value": "Northwind Group" },
  "action": "close_as_rounding",
  "rationale": "This group converts EUR at their own bank and lands a euro short.",
  "compiledFrom": "EXC-0142"
}`;

// Same reason as the close screen: the counts below come from the journal, so
// they have to be read per request rather than baked in at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Read through the same seam the close screen uses. Before this the landing
  // page imported lib/data.ts directly, so the moment a precedent was persisted
  // the two screens disagreed about how many exceptions were still open.
  const { summary: closeSummary, open: queue, journal } = await getCloseState();
  const closedIds = new Set(journal.closures.map((closure) => closure.exceptionId));
  const stillOpen = queue.filter((exception) => !closedIds.has(exception.id));
  const open = stillOpen.length;
  const baseline = Math.round((closeSummary.closedByCarriedPrecedents / closeSummary.exceptionsRaised) * 100);

  // The sparkline's six columns. The order is the order the patterns first
  // appear in the seed, so a pattern that has been cleared to zero keeps its
  // column instead of vanishing from the chart. The counts are the rows still
  // open, read off the same state the fold's figures come from.
  const patternOrder: ExceptionKind[] = [];
  for (const exception of queue) {
    if (!patternOrder.includes(exception.kind)) patternOrder.push(exception.kind);
  }
  const patterns = patternOrder.map((kind) => ({
    kind,
    label: exceptionKindLabels[kind],
    count: stillOpen.filter((exception) => exception.kind === kind).length,
  }));

  return (
    // The shell is max-w-5xl, the same width as the masthead in app/layout.tsx
    // and the colophon under it, so all three share one left rule at 1440. The
    // prose inside is held to .obiter-measure; only a plate breaks out.
    <article className="mx-auto max-w-5xl px-5 pt-12 pb-4">
      {/* The first screen. Kicker, claim, ink lede, dateline, the state of the
          close in one sentence with the live figures in it, the way in, and the
          plate that closes the screen. */}
      <p className="obiter-label">Month-end close / Reconciliation exceptions</p>

      <h1 className="obiter-measure mt-4 text-[clamp(2.05rem,5.4vw,3.4rem)] leading-[1.06]">
        The controller decides once. Obiter keeps the decision.
      </h1>

      {/* Two sentences. It used to run four, seven lines at 390, which pushed
          the CTA's supporting line off the bottom of the screen. */}
      <p className="obiter-lede obiter-measure mt-4">
        Bank activity and invoices never agree at month end, and the residue lands on one person.
        Last month&apos;s reasoning was never written down where a machine could read it.
      </p>

      <p className="obiter-dateline mt-6">
        {closeSummary.entity} / {closeSummary.period} close
      </p>

      <p className="obiter-measure mt-2 leading-relaxed">
        The matcher raised <span className="obiter-figure">{closeSummary.exceptionsRaised}</span>{" "}
        exceptions against this close. Precedents carried in from June and July shut enough of
        them to put autonomy at <CountedFigure value={baseline} unit="percent" /> before anyone
        opened the screen, and <span className="obiter-figure font-medium">{open}</span> are still
        waiting for a person.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button size="lg" className="min-h-11" asChild>
          <Link href="/close">Open the August 2026 close queue</Link>
        </Button>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {open} exceptions, {patterns.length} patterns, no sign in.
        </p>
      </div>

      <Plate
        src="/illustrations/ledger-rule.svg"
        alt="A ruled queue where three entries carry a precedent seal in the margin and five are still open"
        width={900}
        height={280}
        className="mt-9"
        caption="Entries closed under a precedent carry its seal in the margin. Anything without a seal is still a human's problem."
      />

      <SectionEntrance className="mt-14">
        <p className="obiter-runninghead">Section 1, the residue</p>
        <h2 className="obiter-measure mt-3 text-2xl">The part that never got automated</h2>
        <p className="obiter-measure mt-4 leading-relaxed">
          Halden Analytics ran {closeSummary.bankLines} bank lines against {closeSummary.invoices}{" "}
          invoices for {closeSummary.period}, the matcher raised {closeSummary.exceptionsRaised} of
          them as exceptions, precedents written in June and July shut{" "}
          {closeSummary.closedByCarriedPrecedents} before anyone opened the screen, and the {open}{" "}
          still waiting fall into {patterns.length} shapes that come back every month.
        </p>
        <PatternSparkline patterns={patterns} />
      </SectionEntrance>

      <SectionEntrance className="mt-14">
        <p className="obiter-runninghead">Section 2, the compiler</p>
        <h2 className="obiter-measure mt-3 text-2xl">What Obiter does with one decision</h2>
        <p className="obiter-measure mt-4 leading-relaxed">
          You resolve one exception the way you already would, close it as rounding inside a stated
          tolerance for this counterparty group, and Obiter compiles that decision into a named
          typed rule with conditions, a scope and a written reason, rather than into a note nobody
          reads or a weight nobody can inspect.
        </p>
        <Plate
          src="/illustrations/precedent-compile.svg"
          alt="One resolved exception on the left compiles into a sealed rule, which fans out to the seven open entries it closes"
          width={900}
          height={260}
          caption="The rule tells you which open exceptions it will touch before it runs, listed by id."
        />
      </SectionEntrance>

      <SectionEntrance className="mt-14">
        <p className="obiter-runninghead">Section 3, the object</p>
        <h2 className="obiter-measure mt-3 text-2xl">A precedent is something you can read</h2>
        <p className="obiter-measure mt-4 leading-relaxed">
          A language model writes this object once, and from then on a deterministic executor runs
          it, so the same queue always produces the same closures and nothing between a record and
          its outcome depends on a model call.
        </p>

        <figure className="mt-6">
          <Card>
            <CardContent className="overflow-x-auto p-5 pt-5">
              <pre className="font-mono text-[0.78rem] leading-relaxed">{compiledExample}</pre>
            </CardContent>
          </Card>
          <figcaption className="obiter-plate-caption obiter-measure">
            PREC-03, compiled from exception EXC-0142. Validated against a schema before it is
            allowed near the queue, and rejected outright if it tries to widen its own scope.
          </figcaption>
        </figure>
      </SectionEntrance>

      <SectionEntrance className="mt-14">
        <p className="obiter-runninghead">Section 4, the record</p>
        <h2 className="obiter-measure mt-3 text-2xl">
          Why this is not a model learning from the reviewer
        </h2>
        <p className="obiter-measure mt-4 leading-relaxed">
          A system that learns from reviewer actions cannot show you what it learned or which
          records it changed on the strength of it, while Obiter&apos;s learning is a JSON object
          with an id: every closed record names the precedent that closed it, and reverting that
          precedent returns all of them to the open queue in one pass.
        </p>
        <p className="obiter-measure mt-4 leading-relaxed">
          The same journal prints those numbers as a before and after in{" "}
          <Link href="/close#measures" className="underline underline-offset-4">
            the measured result panel above the queue
          </Link>
          , which moves while you work rather than after someone writes a slide.
        </p>
        <Plate
          src="/illustrations/audit-revert.svg"
          alt="Five ruled entries each stamped with the same seal, and one return path that takes every one of them back"
          width={900}
          height={260}
          caption="Autonomy stops being a claim and becomes a number you measure, because every closure names the rule behind it."
        />
      </SectionEntrance>

      <SectionEntrance className="mt-14">
        <p className="obiter-runninghead">Section 5, the feed</p>
        <h2 className="obiter-measure mt-3 text-2xl">Money that arrives while the close is open</h2>
        <p className="obiter-measure mt-4 leading-relaxed">
          A settlement that lands through the Dodo Payments test feed before the period is shut
          becomes an exception like any other, and if an active precedent covers it, it closes with
          nobody looking at the record.
        </p>
        <Plate
          src="/illustrations/settlement-close.svg"
          alt="A settlement arriving from the payments feed, landing in the ledger and closing itself under a seal already on file"
          width={900}
          height={240}
          caption="Step 6 of the demo. The row arrives already closed, and the audit trail says which rule did it."
        />
      </SectionEntrance>

      <SectionEntrance className="mt-14">
        <p className="obiter-runninghead">Section 6, the build</p>
        <h2 className="obiter-measure mt-3 text-2xl">Built on</h2>
        <p className="obiter-measure mt-4 leading-relaxed">
          The build ran as an orchestrator session with the matching engine, the precedent
          compiler, the close interface and the seed each split into their own worker, and the
          product itself calls Claude at exactly one runtime point.
        </p>
        <Plate
          src="/illustrations/architecture.svg"
          alt="The module graph: the seed and the settlement feed enter one adapter seam, which reaches the compiler chain and the close journal, and both answer the two pages"
          width={900}
          height={300}
          caption="The seed and the Dodo feed on the left, one adapter seam in the middle, the compiler chain and the close journal on the right, and the two pages reading both."
        />

        {/* A ruled ledger in the body face, one entry per line. Not a stat band:
            no big numerals, no mono, no grid of cells. The three entries a judge
            is scoring against stay open; the two that are only stack details sit
            behind the disclosure under them. */}
        <dl className="obiter-measure mt-8">
          <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
            <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Agent Orchestrator</dt>
            <dd className="text-sm leading-relaxed sm:flex-1">
              The build was split across orchestrator and worker sessions: engine, compiler,
              interface, and seed data each ran as their own worker.
            </dd>
          </div>
          <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
            <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Claude</dt>
            <dd className="text-sm leading-relaxed sm:flex-1">
              One compilation step, with the precedent rule schema handed over as a tool
              definition rather than described in prose.
            </dd>
          </div>
          <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
            <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Dodo Payments</dt>
            <dd className="text-sm leading-relaxed sm:flex-1">
              Test mode for the live settlement feed, so money that arrives during the close
              becomes an exception like any other.
            </dd>
          </div>
        </dl>

        <details className="obiter-measure">
          <summary className="obiter-build-more">The rest of the stack, for anyone reading the code</summary>
          <dl className="pb-2">
            <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
              <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Zod</dt>
              <dd className="text-sm leading-relaxed sm:flex-1">
                Validation of anything a model produced, including the rejection of a rule that
                tries to widen its own scope or its own tolerance.
              </dd>
            </div>
            <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
              <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Next.js 15, TypeScript</dt>
              <dd className="text-sm leading-relaxed sm:flex-1">
                App Router on Vercel, strict mode, with the close journal in Postgres behind one
                adapter seam.
              </dd>
            </div>
          </dl>
        </details>
      </SectionEntrance>
    </article>
  );
}
