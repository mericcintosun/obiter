// Live settlement feed, backed by Dodo Payments.
//
// The close screen is not a static dataset: new money lands while the period is
// still open. When DODO_PAYMENTS_API_KEY is set this reads real payments from
// the Dodo test environment; without a key it returns the same shape from the
// fixtures below, so the demo runs on a laptop with no accounts.
//
// TODO: swap this fetch for the official `dodopayments` Node SDK once the key
// is in place. The response mapping in mapDodoPayments is the only thing that
// changes; nothing else in the app knows where a settlement came from.

import type { ReconException } from "@/lib/data";
import {
  DODO_API_BASE,
  DODO_API_KEY,
  LOG_PREFIX,
  UPSTREAM_RETRIES,
  UPSTREAM_TIMEOUT_MS,
} from "@/lib/config";

export interface IncomingSettlement {
  paymentId: string;
  counterparty: string;
  counterpartyGroup: string;
  invoiceNumber: string;
  invoiceAmount: number;
  receivedAmount: number;
  currency: string;
  settledOn: string;
  source: "dodo" | "fixture";
}

// Three settlements that arrive after the queue is already on screen. The first
// is the demo one: a Northwind short payment that an existing precedent closes
// with nobody touching it.
const fixtureSettlements: Omit<IncomingSettlement, "source">[] = [
  {
    paymentId: "pay_8f21c4d0",
    counterparty: "Northwind Freight BV",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0791",
    invoiceAmount: 1560.0,
    receivedAmount: 1558.71,
    currency: "USD",
    settledOn: "2026-08-31",
  },
  {
    paymentId: "pay_1b77ae52",
    counterparty: "Northwind Logistics GmbH",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0794",
    invoiceAmount: 2075.0,
    receivedAmount: 2073.62,
    currency: "USD",
    settledOn: "2026-08-31",
  },
  {
    paymentId: "pay_c903de17",
    counterparty: "Halcyon Print Co",
    counterpartyGroup: "Halcyon Print Co",
    invoiceNumber: "INV-2026-0796",
    invoiceAmount: 1340.0,
    receivedAmount: 1340.0,
    currency: "USD",
    settledOn: "2026-08-31",
  },
];

interface DodoPayment {
  payment_id?: string;
  business_id?: string;
  customer?: { name?: string; email?: string };
  total_amount?: number;
  settlement_amount?: number;
  currency?: string;
  created_at?: string;
  metadata?: Record<string, string>;
}

function mapDodoPayments(payments: DodoPayment[]): IncomingSettlement[] {
  return payments.map((payment, index) => {
    // Dodo reports minor units. The invoice number rides on payment metadata,
    // which is what the checkout writes when a customer pays an open invoice.
    const gross = (payment.total_amount ?? 0) / 100;
    const settled = (payment.settlement_amount ?? payment.total_amount ?? 0) / 100;
    const counterparty = payment.customer?.name ?? "Unnamed payer";
    return {
      paymentId: payment.payment_id ?? `pay_unknown_${index}`,
      counterparty,
      counterpartyGroup: payment.metadata?.counterparty_group ?? counterparty,
      invoiceNumber: payment.metadata?.invoice_number ?? `INV-UNMAPPED-${index}`,
      invoiceAmount: gross,
      receivedAmount: settled,
      currency: (payment.currency ?? "USD").toUpperCase(),
      settledOn: (payment.created_at ?? new Date().toISOString()).slice(0, 10),
      source: "dodo" as const,
    };
  });
}

/**
 * The same bound the compiler call gets: a hard timeout per attempt and exactly
 * one retry, in a counted loop that cannot run more than twice. A settlement
 * feed that hangs must not hold the close screen open, and the caller already
 * falls to the fixtures when this throws.
 */
async function fetchOnce(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= UPSTREAM_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (response.status >= 500 && attempt < UPSTREAM_RETRIES) continue;
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < UPSTREAM_RETRIES) continue;
    }
  }

  throw lastError ?? new Error("the settlement feed did not answer");
}

/**
 * Whether a live payment can play the part DEMO.md step 6 asks of it.
 *
 * Two conditions, both about the demo rather than about Dodo. A payment whose
 * metadata carried no invoice number is mapped to an INV-UNMAPPED placeholder,
 * and a placeholder cannot be reconciled against anything. A payment that is
 * not short of its invoice produces no delta, so no precedent closes it and
 * step 6 shows a row sitting open instead of closing itself.
 */
export function usableForDemo(settlement: IncomingSettlement): boolean {
  if (settlement.invoiceNumber.startsWith("INV-UNMAPPED")) return false;
  // Rounded to cents the same way settlementToException rounds it, so the two
  // functions cannot disagree about whether a payment is short.
  const delta = Math.round((settlement.invoiceAmount - settlement.receivedAmount) * 100) / 100;
  return delta > 0;
}

/**
 * One settlement out of a page of them, walked by `sequence`.
 *
 * This is what makes a second and third pull return different money instead of
 * the same newest payment three times. Returns null when the page held nothing
 * that could be reconciled, which is the caller's signal to use the fixture.
 */
export function pickSettlement(
  mapped: IncomingSettlement[],
  sequence: number
): IncomingSettlement | null {
  const filtered = mapped.filter(usableForDemo);
  if (filtered.length === 0) return null;
  return filtered[sequence % filtered.length];
}

/**
 * One settlement. `sequence` walks both paths: the live page through
 * `pickSettlement`, and the fixture list below, so repeated calls during a demo
 * return different money either way.
 */
export async function fetchLatestSettlement(sequence = 0): Promise<IncomingSettlement> {
  if (DODO_API_KEY) {
    let picked: IncomingSettlement | null = null;
    try {
      // A page, not a single row. One newest payment is one chance of being a
      // short payment with an invoice number on it; ten is enough that a test
      // account with ordinary traffic still has something step 6 can use.
      const response = await fetchOnce(`${DODO_API_BASE}/payments?page_size=10&status=succeeded`, {
        headers: { Authorization: `Bearer ${DODO_API_KEY}`, "content-type": "application/json" },
        cache: "no-store",
      });
      if (response.ok) {
        const body = (await response.json()) as { items?: DodoPayment[]; data?: DodoPayment[] };
        const payments = body.items ?? body.data ?? [];
        picked = pickSettlement(mapDodoPayments(payments), sequence);
      }
    } catch {
      // Fall through to the fixture. A settlement feed that is down must never
      // take the close screen with it.
      picked = null;
    }

    if (picked) return picked;
    console.warn(
      `${LOG_PREFIX} the live settlement feed had nothing that could be reconciled, so the fixture answered seq=${sequence}`
    );
  }

  const fixture = fixtureSettlements[sequence % fixtureSettlements.length];
  return { ...fixture, source: "fixture" };
}

/** Turns an incoming settlement into an exception the same engine can reason about. */
export function settlementToException(
  settlement: IncomingSettlement,
  exceptionId: string
): ReconException {
  const delta = Math.round((settlement.invoiceAmount - settlement.receivedAmount) * 100) / 100;
  const isShort = delta > 0;

  return {
    id: exceptionId,
    kind: isShort ? "short_payment" : "reference_mismatch",
    counterparty: settlement.counterparty,
    counterpartyGroup: settlement.counterpartyGroup,
    invoiceNumber: settlement.invoiceNumber,
    invoiceAmount: settlement.invoiceAmount,
    receivedAmount: settlement.receivedAmount,
    currency: settlement.currency,
    invoiceDate: settlement.settledOn,
    settlementDate: settlement.settledOn,
    daysApart: 0,
    priorOccurrences: 0,
    evidence: [
      `Settlement ${settlement.paymentId} arrived while the period was still open.`,
      `Invoice ${settlement.invoiceNumber} at ${settlement.invoiceAmount.toFixed(2)} ${settlement.currency}, received ${settlement.receivedAmount.toFixed(2)}.`,
      settlement.source === "dodo"
        ? "Source: Dodo Payments test environment."
        : "Source: local settlement fixture (no Dodo key set).",
    ],
    blockedReason: isShort
      ? "Short payment on a live settlement."
      : "Live settlement with no invoice reference.",
  };
}
