"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  type CarriedPrecedent,
  type CloseSummary,
  type ReconException,
  exceptionKindLabels,
  formatDate,
  formatMoney,
  shortfall,
} from "@/lib/data";
import {
  type ControllerDecision,
  type PrecedentAction,
  type PrecedentRule,
  type PrecedentScopeLevel,
  matchesPrecedent,
  precedentActionLabels,
  precedentScopeLabels,
  scopeValueFor,
} from "@/lib/precedent";
import type {
  ApiError,
  CompilePrecedentResponse,
  SettlementResponse,
} from "@/lib/types";

interface Props {
  initialQueue: ReconException[];
  summary: CloseSummary;
  carried: CarriedPrecedent[];
}

type RowStatus =
  | { state: "open" }
  | { state: "closed"; precedentId: string; byHuman: boolean };

const actionChoices: Record<ReconException["kind"], PrecedentAction[]> = {
  short_payment: ["close_as_rounding", "close_as_fx_variance", "hold_for_review"],
  fx_difference: ["close_as_fx_variance", "close_as_rounding", "hold_for_review"],
  batched_remittance: ["split_match", "hold_for_review"],
  late_settlement: ["close_as_timing", "hold_for_review"],
  duplicate_fee: ["reverse_duplicate", "hold_for_review"],
  reference_mismatch: ["match_on_reference", "hold_for_review"],
};

const defaultScope: Record<ReconException["kind"], PrecedentScopeLevel> = {
  short_payment: "counterparty_group",
  fx_difference: "all_counterparties",
  batched_remittance: "counterparty",
  late_settlement: "all_counterparties",
  duplicate_fee: "counterparty",
  reference_mismatch: "counterparty",
};

function defaultTolerance(exception: ReconException): number {
  const delta = Math.abs(shortfall(exception));
  return Math.ceil(delta * 2) / 2;
}

function openStatuses(queue: ReconException[]): Record<string, RowStatus> {
  const map: Record<string, RowStatus> = {};
  for (const exception of queue) map[exception.id] = { state: "open" };
  return map;
}

const sourceLabels: Record<string, string> = {
  anthropic: "Claude via the Anthropic API",
  "claude-cli": "your local claude CLI",
  fixture: "the checked-in fixture compiler",
  deterministic: "the offline deterministic compiler",
};

export function CloseQueue({ initialQueue, summary, carried }: Props) {
  const [live, setLive] = useState<ReconException[]>([]);
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>(() =>
    openStatuses(initialQueue)
  );
  const [precedents, setPrecedents] = useState<PrecedentRule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<PrecedentAction>("close_as_rounding");
  const [scopeLevel, setScopeLevel] = useState<PrecedentScopeLevel>("counterparty_group");
  const [tolerance, setTolerance] = useState("2");
  const [rationale, setRationale] = useState("");
  const [proposal, setProposal] = useState<CompilePrecedentResponse | null>(null);
  const [phase, setPhase] = useState<"idle" | "compiling" | "proposed" | "pulling">("idle");
  const [error, setError] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [justChanged, setJustChanged] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const settlementSeq = useRef(0);

  const exceptions = useMemo(() => [...initialQueue, ...live], [initialQueue, live]);
  const openQueue = useMemo(
    () => exceptions.filter((e) => statuses[e.id]?.state === "open"),
    [exceptions, statuses]
  );
  const selected = exceptions.find((e) => e.id === selectedId) ?? null;

  const raised = summary.exceptionsRaised + live.length;
  const autonomousClosures =
    summary.closedByCarriedPrecedents +
    Object.values(statuses).filter((s) => s.state === "closed" && !s.byHuman).length;
  const autonomy = Math.round((autonomousClosures / raised) * 100);
  const humanTouches = Object.values(statuses).filter(
    (s) => s.state === "closed" && s.byHuman
  ).length;

  const flash = useCallback((ids: string[]) => {
    setJustChanged(ids);
    window.setTimeout(() => setJustChanged([]), 1400);
  }, []);

  const note = useCallback((line: string) => {
    setLog((previous) => [line, ...previous].slice(0, 8));
  }, []);

  function selectException(exception: ReconException) {
    setError(null);
    setProposal(null);
    setPhase("idle");
    setInspecting(null);
    if (selectedId === exception.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(exception.id);
    setAction(actionChoices[exception.kind][0]);
    setScopeLevel(defaultScope[exception.kind]);
    setTolerance(defaultTolerance(exception).toFixed(2));
    setRationale("");
  }

  async function compile() {
    if (!selected) return;
    setPhase("compiling");
    setError(null);
    setProposal(null);

    const decision: ControllerDecision = {
      exceptionId: selected.id,
      action,
      toleranceAmount: Number.parseFloat(tolerance) || 0,
      scopeLevel,
      rationale,
      decidedBy: "Dana Rowe, controller",
    };

    try {
      const response = await fetch("/api/precedent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          exception: selected,
          decision,
          queue: openQueue,
          existingPrecedentIds: [...carried.map((c) => c.id), ...precedents.map((p) => p.id)],
        }),
      });
      const payload = (await response.json()) as CompilePrecedentResponse & Partial<ApiError>;
      if (!response.ok) throw new Error(payload.error ?? "The compiler did not answer.");
      setProposal(payload);
      setPhase("proposed");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The compiler did not answer.");
      setPhase("idle");
    }
  }

  function applyProposal() {
    if (!proposal || !selected) return;
    const rule = proposal.rule;
    const touched = proposal.wouldClose.filter((id) => statuses[id]?.state === "open");

    setStatuses((previous) => {
      const next = { ...previous };
      for (const id of touched) {
        next[id] = { state: "closed", precedentId: rule.id, byHuman: id === selected.id };
      }
      return next;
    });
    setPrecedents((previous) => [...previous, rule]);
    flash(touched);
    note(
      `${rule.id} applied. ${touched.length} exception${touched.length === 1 ? "" : "s"} closed, ${
        touched.length - 1
      } of them without a human looking at the record.`
    );
    setProposal(null);
    setPhase("idle");
    setSelectedId(null);
  }

  function revertPrecedent(precedentId: string) {
    const touched = Object.entries(statuses)
      .filter(([, status]) => status.state === "closed" && status.precedentId === precedentId)
      .map(([id]) => id);

    setStatuses((previous) => {
      const next = { ...previous };
      for (const id of touched) next[id] = { state: "open" };
      return next;
    });
    setPrecedents((previous) => previous.filter((p) => p.id !== precedentId));
    flash(touched);
    note(`${precedentId} reverted. ${touched.length} records returned to the open queue.`);
    setInspecting(null);
  }

  async function pullSettlement() {
    setPhase("pulling");
    setError(null);
    const sequence = settlementSeq.current;
    const exceptionId = `EXC-09${String(sequence + 1).padStart(2, "0")}`;

    try {
      const response = await fetch(`/api/settlements?seq=${sequence}&id=${exceptionId}`);
      const payload = (await response.json()) as SettlementResponse & Partial<ApiError>;
      if (!response.ok) throw new Error(payload.error ?? "The settlement feed did not answer.");

      settlementSeq.current = sequence + 1;
      const incoming = payload.exception;
      const nextQueue = [...openQueue, incoming];
      const hit = precedents.find((rule) => matchesPrecedent(rule, incoming, nextQueue));

      setLive((previous) => [...previous, incoming]);
      setStatuses((previous) => ({
        ...previous,
        [incoming.id]: hit
          ? { state: "closed", precedentId: hit.id, byHuman: false }
          : { state: "open" },
      }));
      flash([incoming.id]);
      note(
        hit
          ? `${incoming.id} arrived from the settlement feed and closed under ${hit.id}. No human touched it.`
          : `${incoming.id} arrived from the settlement feed. No precedent covers it, so it is in the queue.`
      );
      if (!hit) setSelectedId(incoming.id);
      setPhase("idle");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The settlement feed did not answer.");
      setPhase("idle");
    }
  }

  function resetClose() {
    setLive([]);
    setStatuses(openStatuses(initialQueue));
    setPrecedents([]);
    setSelectedId(null);
    setProposal(null);
    setInspecting(null);
    setError(null);
    setPhase("idle");
    setLog([]);
    settlementSeq.current = 0;
  }

  const inspected = precedents.find((p) => p.id === inspecting) ?? null;
  const inspectedRecords = inspected
    ? Object.entries(statuses)
        .filter(([, status]) => status.state === "closed" && status.precedentId === inspected.id)
        .map(([id]) => exceptions.find((e) => e.id === id))
        .filter((e): e is ReconException => Boolean(e))
    : [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <p className="obiter-label">
        {summary.entity} / {summary.period} close
      </p>
      <h1 className="mt-3 text-[clamp(2rem,4.4vw,2.8rem)] leading-tight">Exception queue</h1>

      <p className="mt-4 max-w-[68ch] leading-relaxed">
        The matcher raised {raised} exceptions this period.{" "}
        <span className="obiter-figure">{autonomousClosures}</span> of them closed with nobody
        looking at the record, which is an autonomy rate of{" "}
        <span className="obiter-figure font-medium">{autonomy} percent</span>.{" "}
        {openQueue.length > 0
          ? `${openQueue.length} are still open. Resolve one and Obiter will compile the decision into a rule and offer to apply it to the rest.`
          : "Nothing is left open. Every pattern in this close has a precedent on file."}
      </p>

      <div className="mt-5 h-2 w-full border border-border bg-surface" aria-hidden>
        <div
          className="h-full bg-second transition-[width] duration-700 ease-out"
          style={{ width: `${autonomy}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Human touches this close: <span className="obiter-figure">{humanTouches}</span>. Precedents
        carried in from earlier closes: {carried.map((c) => c.id).join(", ")}. Written today:{" "}
        {precedents.length > 0 ? precedents.map((p) => p.id).join(", ") : "none yet"}.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={pullSettlement} disabled={phase === "pulling"}>
          {phase === "pulling" ? "Pulling settlement..." : "Pull latest settlement"}
        </Button>
        <Button variant="ghost" onClick={resetClose}>
          Reset the close
        </Button>
      </div>

      {error ? (
        <Card className="mt-6 border-bad">
          <CardContent className="p-4 pt-4 text-sm">
            <span className="font-medium text-bad">Something failed. </span>
            {error}
          </CardContent>
        </Card>
      ) : null}

      {log.length > 0 ? (
        <Card className="mt-6">
          <CardContent className="p-5 pt-5">
            <p className="obiter-label">Audit trail</p>
            <ul className="mt-3 space-y-2 text-sm">
              {log.map((line, index) => (
                <li key={`${line}-${index}`} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {inspected ? (
        <Card className="mt-6 border-seal">
          <CardContent className="p-5 pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="obiter-label">Precedent {inspected.id}</p>
                <h2 className="mt-1 text-xl">{inspected.name}</h2>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setInspecting(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => revertPrecedent(inspected.id)}
                >
                  Revert this precedent
                </Button>
              </div>
            </div>
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed">{inspected.rationale}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Compiled from {inspected.compiledFrom} by {inspected.authoredBy}. It has touched{" "}
              {inspectedRecords.length} record{inspectedRecords.length === 1 ? "" : "s"}. Reverting
              returns all of them to the open queue in one pass.
            </p>
            <ul className="mt-4 space-y-1 text-sm">
              {inspectedRecords.map((record) => (
                <li key={record.id} className="obiter-rule flex justify-between gap-4 py-1.5">
                  <span>
                    {record.id} {record.counterparty}
                  </span>
                  <span className="obiter-figure text-muted-foreground">
                    {formatMoney(shortfall(record), record.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="obiter-rule mt-10" />

      {openQueue.length === 0 && exceptions.length > 0 ? (
        <div className="border border-border bg-surface px-6 py-10 text-center">
          <h2 className="text-xl">The queue is empty</h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
            Every open exception in this close is covered by a precedent. Pull a settlement to see
            what happens to money that arrives now, or revert a precedent to put its records back.
          </p>
        </div>
      ) : null}

      <ul className="obiter-queue mt-2">
        {exceptions.map((exception) => {
          const status: RowStatus = statuses[exception.id] ?? { state: "open" };
          const isClosed = status.state === "closed";
          const isSelected = selectedId === exception.id;
          const changed = justChanged.includes(exception.id);
          const delta = shortfall(exception);

          return (
            <li
              key={exception.id}
              className={cn("obiter-rule", changed && "obiter-wipe", isClosed && "opacity-70")}
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => selectException(exception)}
                  className="h-auto min-w-0 flex-1 justify-start whitespace-normal rounded-none px-2 py-3 text-left"
                >
                  {/* Under sm the counterparty and the pattern take the full
                      width and the row wraps to three lines: id and amount
                      together, then the name, then the pattern. The fixed
                      column widths only apply from sm up, so a 375px viewport
                      never pushes the body sideways. */}
                  <span className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="obiter-figure order-1 w-[5.5rem] shrink-0 text-muted-foreground">
                      {exception.id}
                    </span>
                    <span className="order-3 w-full font-medium sm:order-2 sm:w-auto sm:min-w-[13rem] sm:flex-1">
                      {exception.counterparty}
                    </span>
                    <span className="order-4 w-full text-sm text-muted-foreground sm:order-3 sm:w-[9.5rem] sm:shrink-0">
                      {exceptionKindLabels[exception.kind]}
                    </span>
                    <span
                      className={cn(
                        "obiter-figure order-2 ml-auto w-[7rem] shrink-0 text-right sm:order-4 sm:ml-0",
                        isClosed ? "text-second" : "text-warn"
                      )}
                    >
                      {formatMoney(delta, exception.currency)}
                    </span>
                  </span>
                </Button>

                {isClosed && status.state === "closed" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-none px-2"
                    onClick={() => setInspecting(status.precedentId)}
                  >
                    <Badge variant="seal" className={cn(changed && "obiter-stamp")}>
                      {status.precedentId}
                    </Badge>
                  </Button>
                ) : (
                  <span className="obiter-label w-[4.5rem] shrink-0 text-right">open</span>
                )}
              </div>

              {isSelected && !isClosed ? (
                <div className="border-t border-border bg-surface px-4 py-5">
                  <p className="obiter-label">What the engine collected</p>
                  <ul className="mt-2 max-w-[68ch] space-y-1.5 text-sm leading-relaxed">
                    {exception.evidence.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                    <li className="text-muted-foreground">
                      Invoice {exception.invoiceNumber} dated {formatDate(exception.invoiceDate)},
                      settled {formatDate(exception.settlementDate)}.
                    </li>
                  </ul>

                  <p className="mt-4 max-w-[68ch] text-sm">
                    <span className="font-medium">Why this reached you: </span>
                    {exception.blockedReason}
                  </p>

                  <div className="obiter-rule mt-5" />

                  <p className="obiter-label mt-5">Your decision</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {actionChoices[exception.kind].map((choice) => (
                      <Button
                        key={choice}
                        size="sm"
                        variant={action === choice ? "default" : "outline"}
                        onClick={() => setAction(choice)}
                      >
                        {precedentActionLabels[choice]}
                      </Button>
                    ))}
                  </div>

                  <p className="obiter-label mt-5">This applies to</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      ["counterparty", "counterparty_group", "all_counterparties"] as PrecedentScopeLevel[]
                    ).map((level) => (
                      <Button
                        key={level}
                        size="sm"
                        variant={scopeLevel === level ? "default" : "outline"}
                        onClick={() => setScopeLevel(level)}
                      >
                        {precedentScopeLabels[level]}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Resolves to: {scopeValueFor(exception, scopeLevel)}
                  </p>

                  <div className="mt-5 flex flex-wrap items-end gap-4">
                    <label className="block">
                      <span className="obiter-label">Tolerance ({exception.currency})</span>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        value={tolerance}
                        onChange={(event) => setTolerance(event.target.value)}
                        className="mt-1 w-32"
                      />
                    </label>
                    <label className="block min-w-[16rem] flex-1">
                      <span className="obiter-label">Reason for the file (optional)</span>
                      <Input
                        value={rationale}
                        placeholder="Their bank converts at its own rate."
                        onChange={(event) => setRationale(event.target.value)}
                        className="mt-1"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button onClick={compile} disabled={phase === "compiling"}>
                      {phase === "compiling" ? "Compiling the precedent..." : "Compile a precedent"}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Nothing closes until you have seen what the rule would touch.
                    </span>
                  </div>

                  {proposal && proposal.rule.compiledFrom === exception.id ? (
                    <Card className="obiter-wipe mt-5 border-seal">
                      <CardContent className="p-5 pt-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-lg font-medium">
                            {proposal.rule.id}: {proposal.rule.name}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            written by {sourceLabels[proposal.source] ?? proposal.source} in{" "}
                            {proposal.elapsedMs} ms
                          </span>
                        </div>

                        <pre className="mt-3 overflow-x-auto border border-border bg-ground p-3 font-mono text-[0.74rem] leading-relaxed">
                          {JSON.stringify(
                            {
                              kind: proposal.rule.kind,
                              conditions: proposal.rule.conditions,
                              scope: proposal.rule.scope,
                              action: proposal.rule.action,
                            },
                            null,
                            2
                          )}
                        </pre>

                        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed">
                          {proposal.rule.rationale}
                        </p>

                        {proposal.rejectedModelOutput ? (
                          <p className="mt-3 text-sm text-warn">
                            One compiler in the chain was rejected before this one was used:{" "}
                            {proposal.rejectedModelOutput}
                          </p>
                        ) : null}

                        <p className="mt-4 text-sm">
                          <span className="font-medium">
                            This will close {proposal.wouldClose.length} open exception
                            {proposal.wouldClose.length === 1 ? "" : "s"}:{" "}
                          </span>
                          <span className="obiter-figure text-muted-foreground">
                            {proposal.wouldClose.join(", ")}
                          </span>
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button onClick={applyProposal}>
                            Apply {proposal.rule.id} to the queue
                          </Button>
                          <Button variant="outline" onClick={() => setProposal(null)}>
                            Discard
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
