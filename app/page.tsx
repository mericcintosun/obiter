import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCloseState } from "@/lib/adapters";

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
  const open = queue.filter((exception) => !closedIds.has(exception.id)).length;
  const baseline = Math.round((closeSummary.closedByCarriedPrecedents / closeSummary.exceptionsRaised) * 100);

  return (
    <article className="mx-auto max-w-[68ch] px-5 pt-12 pb-4">
      {/* The first screen. Kicker, claim, ink lede, dateline, the state of the
          close in one sentence with the live figures in it, and the way in. The
          CTA used to sit two and a half screens below this. */}
      <p className="obiter-label">Month-end close / Reconciliation exceptions</p>

      <h1 className="mt-4 text-[clamp(2.25rem,5.4vw,3.4rem)] leading-[1.06]">
        The controller decides once. Obiter keeps the decision.
      </h1>

      <p className="obiter-lede mt-5">
        Bank activity and invoices never agree at the end of the month. The easy 90 percent
        matches itself. What is left is a list of exceptions that one person works through by
        hand, every month, from scratch, because last month&apos;s reasoning was never written
        down anywhere a machine could read it.
      </p>

      <p className="obiter-dateline mt-7">
        {closeSummary.entity} / {closeSummary.period} close
      </p>

      <p className="mt-2 leading-relaxed">
        The matcher raised <span className="obiter-figure">{closeSummary.exceptionsRaised}</span>{" "}
        exceptions against this close. Precedents carried in from June and July shut enough of
        them to put autonomy at{" "}
        <span className="obiter-figure font-medium">{baseline} percent</span> before anyone opened
        the screen, and <span className="obiter-figure font-medium">{open}</span> are still sitting
        there waiting for a person. That queue is live in this app right now.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button size="lg" className="min-h-11" asChild>
          <Link href="/close">Open the August 2026 close queue</Link>
        </Button>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {open} open exceptions across six patterns, seeded and ready. No sign in, no keys
          needed.
        </p>
      </div>

      <figure className="mt-9">
        {/* unoptimized because the image optimizer refuses SVG in production, and
            this asset is ours and already small. This is an illustration, not a
            brand mark, so the one mark rule in app/layout.tsx is untouched. */}
        <Image
          src="/illustrations/ledger-rule.svg"
          alt="A ruled queue where three entries carry a precedent seal in the margin and five are still open"
          width={900}
          height={280}
          unoptimized
          className="w-full border border-border"
        />
        <figcaption className="mt-3 text-sm text-muted-foreground">
          Entries closed under a precedent carry its seal in the margin. Anything without a seal
          is still a human&apos;s problem.
        </figcaption>
      </figure>

      <div className="obiter-rule mt-10" />

      <p className="obiter-runninghead mt-10">Section 1, the residue</p>
      <h2 className="mt-3 text-2xl">The part that never got automated</h2>
      <p className="mt-4 leading-relaxed">
        Underpayments. Currency moves between the invoice date and the settlement date. One
        transfer covering three invoices. Money that arrives two days after the cutoff. A
        controller at a 10 to 50 person company, or the close team at an accounting firm,
        resolves each of these individually. When the same customer underpays by the same
        euro next month, the same line lands back in the queue and gets the same thirty
        seconds of thought.
      </p>
      <p className="mt-4 leading-relaxed">
        The seeded close in this repo is a fair example. Halden Analytics ran{" "}
        {closeSummary.bankLines} bank lines against {closeSummary.invoices} invoices for{" "}
        {closeSummary.period}. The matcher raised {closeSummary.exceptionsRaised} exceptions.
        Precedents written in June and July shut {closeSummary.closedByCarriedPrecedents} of
        them before anyone opened the screen, which is a {baseline} percent autonomy rate. The
        remaining {open} are waiting for a human.
      </p>

      <p className="obiter-runninghead mt-10">Section 2, the compiler</p>
      <h2 className="mt-3 text-2xl">What Obiter does with one decision</h2>
      <p className="mt-4 leading-relaxed">
        You resolve a single exception the way you already would: this customer is short by
        $1.65 because their bank converted at a different rate, close it as rounding, tolerance
        $2.00, applies to the Northwind group. Obiter takes that and compiles it. Not into a
        note, and not into a model weight. Into a named, typed rule with conditions, a
        tolerance, a scope, and a written reason.
      </p>
      <p className="mt-4 leading-relaxed">
        Before the rule runs, it tells you exactly which open exceptions it will touch. You
        approve, and they close in front of you, each one stamped with the precedent id. If the
        rule was wrong, one click reverts every record it ever touched, in a single pass.
      </p>
      <p className="mt-4 leading-relaxed">
        The close screen carries the measured result of the close you are looking at: open
        exceptions, closures with no human on the record, autonomy, and human touches, each one
        shown as it stood when the close was opened and as it stands now. Those figures are read
        off the same journal the queue renders from, so{" "}
        <Link href="/close#measures" className="underline underline-offset-4">
          the measured result panel above the queue
        </Link>{" "}
        moves while you work rather than after someone writes a slide.
      </p>

      <p className="obiter-runninghead mt-10">Section 3, the object</p>
      <h2 className="mt-3 text-2xl">A precedent is something you can read</h2>
      <p className="mt-4 leading-relaxed">
        This is the whole object a decision compiles to. A language model writes it once. After
        that a deterministic executor runs it, so the same queue always produces the same
        closures, and nothing between a record and its outcome depends on a model call.
      </p>

      <figure className="mt-6">
        <Card>
          <CardContent className="overflow-x-auto p-5 pt-5">
            <pre className="font-mono text-[0.78rem] leading-relaxed">{compiledExample}</pre>
          </CardContent>
        </Card>
        <figcaption className="mt-3 text-sm text-muted-foreground">
          PREC-03, compiled from exception EXC-0142. Validated against a schema before it is
          allowed near the queue, and rejected outright if it tries to widen its own scope.
        </figcaption>
      </figure>

      <details className="obiter-rule mt-10 border-t border-border pt-6 [&_summary]:cursor-pointer">
        <summary className="text-lg font-medium">
          How the compiler is wired, for anyone reading the code
        </summary>
        <div className="mt-4 space-y-4 leading-relaxed">
          <p>
            The matching engine is deterministic and produces a structured exception record for
            every line it cannot clear: pattern, counterparty, shortfall, days apart, evidence,
            and the reason it escalated instead of deciding.
          </p>
          <p>
            When you resolve one, the compiler runs on a priority chain. With an Anthropic key
            set it calls Claude with the precedent schema as a tool definition. Without one it
            tries your local <code className="font-mono text-[0.85em]">claude</code> CLI, so the
            loop is real on a laptop with no accounts. If both are unavailable it falls back to
            a deterministic draft built from your own inputs. Every path goes through the same
            schema check, and output that fails it is thrown away rather than patched.
          </p>
          <p>
            Live settlements come in through Dodo Payments in test mode. A payment that lands
            while the period is still open becomes an exception like any other, and if an active
            precedent covers it, it closes without a person seeing it.
          </p>
        </div>
      </details>

      <p className="obiter-runninghead mt-10">Section 4, the argument</p>
      <h2 className="mt-3 text-2xl">Why not just let a model learn from the reviewer</h2>
      <p className="mt-4 leading-relaxed">
        Several reconciliation products now claim to learn from reviewer actions and act on
        their own after enough training. That is a hard thing to sign off on, because you cannot
        read what the system learned, you cannot see which records it changed on the strength of
        it, and you cannot take it back. Obiter&apos;s learning is a JSON object with a name and
        an id. You can read it, you can see the list of records it touched, and you can revert
        it. Autonomy stops being a claim and becomes a number you measure: {baseline} percent at
        the start of this close, and higher after every precedent you approve.
      </p>

      <p className="obiter-runninghead mt-10">Section 5, the build</p>
      <h2 className="mt-3 text-2xl">Built on</h2>
      {/* A ruled ledger in the body face, one entry per line. Not a stat band:
          no big numerals, no mono, no grid of cells. */}
      <dl className="mt-5">
        <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
          <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Agent Orchestrator</dt>
          <dd className="text-sm leading-relaxed sm:flex-1">
            The build was split across orchestrator and worker sessions: engine, compiler,
            interface, and seed data each ran as their own worker.
          </dd>
        </div>
        <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
          <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Claude</dt>
          <dd className="text-sm leading-relaxed sm:flex-1">
            One compilation step, with the precedent rule schema handed over as a tool
            definition rather than described in prose.
          </dd>
        </div>
        <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
          <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Zod</dt>
          <dd className="text-sm leading-relaxed sm:flex-1">
            Validation of anything a model produced, including the rejection of a rule that
            tries to widen its own scope or its own tolerance.
          </dd>
        </div>
        <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
          <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Dodo Payments</dt>
          <dd className="text-sm leading-relaxed sm:flex-1">
            Test mode for the live settlement feed, so money that arrives during the close
            becomes an exception like any other.
          </dd>
        </div>
        <div className="obiter-rule flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
          <dt className="font-medium sm:w-[13.5rem] sm:shrink-0">Next.js 15 and TypeScript</dt>
          <dd className="text-sm leading-relaxed sm:flex-1">
            App Router on Vercel, strict mode, with the close journal in Postgres behind one
            adapter seam.
          </dd>
        </div>
      </dl>
    </article>
  );
}
