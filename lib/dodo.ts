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

const DODO_API_BASE = process.env.DODO_PAYMENTS_API_BASE ?? "https://test.dodopayments.com";

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
 * One settlement, newest first. `sequence` only matters for the fixture path:
 * it walks the list so repeated calls during a demo return different money.
 */
export async function fetchLatestSettlement(sequence = 0): Promise<IncomingSettlement> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(`${DODO_API_BASE}/payments?page_size=1&status=succeeded`, {
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        cache: "no-store",
      });
      if (response.ok) {
        const body = (await response.json()) as { items?: DodoPayment[]; data?: DodoPayment[] };
        const payments = body.items ?? body.data ?? [];
        const mapped = mapDodoPayments(payments);
        if (mapped.length > 0) return mapped[0];
      }
    } catch {
      // Fall through to the fixture. A settlement feed that is down must never
      // take the close screen with it.
    }
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
