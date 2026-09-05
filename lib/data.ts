// Seed for the August 2026 close of Halden Analytics, a 34 person B2B analytics
// company. The matching engine already cleared the easy 90 percent of the
// ledger. What is left here is the residue a controller works through by hand:
// 24 open exceptions across six patterns.
//
// Every number is internally consistent. The autonomy figure on the close
// screen is computed from these counts, never hardcoded.

export type ExceptionKind =
  | "short_payment"
  | "fx_difference"
  | "batched_remittance"
  | "late_settlement"
  | "duplicate_fee"
  | "reference_mismatch";

export const exceptionKindLabels: Record<ExceptionKind, string> = {
  short_payment: "Short payment",
  fx_difference: "FX difference",
  batched_remittance: "Batched remittance",
  late_settlement: "Late settlement",
  duplicate_fee: "Duplicate fee",
  reference_mismatch: "Reference mismatch",
};

export interface ReconException {
  id: string;
  kind: ExceptionKind;
  counterparty: string;
  counterpartyGroup: string;
  invoiceNumber: string;
  invoiceAmount: number;
  receivedAmount: number;
  currency: string;
  invoiceDate: string;
  settlementDate: string;
  /** Days between the invoice due date and the settlement hitting the account. */
  daysApart: number;
  /** How often this counterparty produced the same pattern in the last six closes. */
  priorOccurrences: number;
  /** What the engine collected before it gave up and escalated. */
  evidence: string[];
  /** Why the agent did not decide this on its own. */
  blockedReason: string;
}

export interface CarriedPrecedent {
  id: string;
  name: string;
  compiledOn: string;
  closedThisPeriod: number;
  summary: string;
}

export interface CloseSummary {
  entity: string;
  period: string;
  bankLines: number;
  invoices: number;
  /** Cleared by the deterministic matcher with no exception raised at all. */
  autoMatched: number;
  /** Total exceptions the matcher raised this period. */
  exceptionsRaised: number;
  /** Of those, how many precedents from earlier closes shut without a human. */
  closedByCarriedPrecedents: number;
}

export const closeSummary: CloseSummary = {
  entity: "Halden Analytics",
  period: "August 2026",
  bankLines: 220,
  invoices: 210,
  autoMatched: 148,
  exceptionsRaised: 62,
  closedByCarriedPrecedents: 38,
};

// Precedents written in earlier closes. They ran on this period's queue before
// anyone opened the screen, which is where the 61 percent baseline comes from.
export const carriedPrecedents: CarriedPrecedent[] = [
  {
    id: "PREC-01",
    name: "Processor fee netted from settlement",
    compiledOn: "2026-06-30",
    closedThisPeriod: 22,
    summary:
      "Settlement short by the card processor's fee, up to 3.2 percent of the invoice, any counterparty paying through Vantage Payments.",
  },
  {
    id: "PREC-02",
    name: "Two day SEPA direct debit lag",
    compiledOn: "2026-07-29",
    closedThisPeriod: 16,
    summary:
      "Exact amount match arriving up to 2 days after the due date on a SEPA direct debit mandate, any counterparty.",
  },
];

export const openExceptions: ReconException[] = [
  // Pattern A: the Northwind entities convert EUR to USD at their own bank and
  // land a euro or two short. Seven rows, one group, the demo's first precedent.
  {
    id: "EXC-0142",
    kind: "short_payment",
    counterparty: "Northwind Freight BV",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0731",
    invoiceAmount: 1204.0,
    receivedAmount: 1202.35,
    currency: "USD",
    invoiceDate: "2026-08-03",
    settlementDate: "2026-08-11",
    daysApart: 1,
    priorOccurrences: 3,
    evidence: [
      "Invoice INV-2026-0731 issued at 1,204.00 USD, due 2026-08-10.",
      "Incoming transfer 1,202.35 USD on 2026-08-11, reference NWF-0731.",
      "Sending bank quoted EUR at 1.0912, our books used 1.0927.",
      "Same counterparty group produced this pattern 3 times in the last 6 closes, never disputed.",
    ],
    blockedReason: "No policy precedent on file for a short payment on this counterparty group.",
  },
  {
    id: "EXC-0144",
    kind: "short_payment",
    counterparty: "Northwind Logistics GmbH",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0744",
    invoiceAmount: 2860.0,
    receivedAmount: 2858.42,
    currency: "USD",
    invoiceDate: "2026-08-05",
    settlementDate: "2026-08-13",
    daysApart: 1,
    priorOccurrences: 4,
    evidence: [
      "Invoice INV-2026-0744 issued at 2,860.00 USD, due 2026-08-12.",
      "Incoming transfer 2,858.42 USD on 2026-08-13, reference NWL-0744.",
      "Shortfall is 0.06 percent of the invoice, inside the historical band for this group.",
    ],
    blockedReason: "No policy precedent on file for a short payment on this counterparty group.",
  },
  {
    id: "EXC-0149",
    kind: "short_payment",
    counterparty: "Northwind Freight BV",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0755",
    invoiceAmount: 940.0,
    receivedAmount: 938.87,
    currency: "USD",
    invoiceDate: "2026-08-07",
    settlementDate: "2026-08-14",
    daysApart: 0,
    priorOccurrences: 3,
    evidence: [
      "Invoice INV-2026-0755 issued at 940.00 USD, due 2026-08-14.",
      "Incoming transfer 938.87 USD on 2026-08-14, reference NWF-0755.",
    ],
    blockedReason: "No policy precedent on file for a short payment on this counterparty group.",
  },
  {
    id: "EXC-0151",
    kind: "short_payment",
    counterparty: "Northwind Marine Ltd",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0761",
    invoiceAmount: 4310.0,
    receivedAmount: 4308.19,
    currency: "USD",
    invoiceDate: "2026-08-08",
    settlementDate: "2026-08-17",
    daysApart: 2,
    priorOccurrences: 2,
    evidence: [
      "Invoice INV-2026-0761 issued at 4,310.00 USD, due 2026-08-15.",
      "Incoming transfer 4,308.19 USD on 2026-08-17, reference NWM-0761.",
      "Largest open shortfall in this group this period.",
    ],
    blockedReason: "No policy precedent on file for a short payment on this counterparty group.",
  },
  {
    id: "EXC-0158",
    kind: "short_payment",
    counterparty: "Northwind Logistics GmbH",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0770",
    invoiceAmount: 1685.0,
    receivedAmount: 1683.94,
    currency: "USD",
    invoiceDate: "2026-08-12",
    settlementDate: "2026-08-20",
    daysApart: 1,
    priorOccurrences: 4,
    evidence: [
      "Invoice INV-2026-0770 issued at 1,685.00 USD, due 2026-08-19.",
      "Incoming transfer 1,683.94 USD on 2026-08-20, reference NWL-0770.",
    ],
    blockedReason: "No policy precedent on file for a short payment on this counterparty group.",
  },
  {
    id: "EXC-0163",
    kind: "short_payment",
    counterparty: "Northwind Marine Ltd",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0778",
    invoiceAmount: 725.0,
    receivedAmount: 723.06,
    currency: "USD",
    invoiceDate: "2026-08-17",
    settlementDate: "2026-08-25",
    daysApart: 1,
    priorOccurrences: 2,
    evidence: [
      "Invoice INV-2026-0778 issued at 725.00 USD, due 2026-08-24.",
      "Incoming transfer 723.06 USD on 2026-08-25, reference NWM-0778.",
      "Shortfall is 0.27 percent, the widest ratio in this group.",
    ],
    blockedReason: "No policy precedent on file for a short payment on this counterparty group.",
  },
  {
    id: "EXC-0166",
    kind: "short_payment",
    counterparty: "Northwind Freight BV",
    counterpartyGroup: "Northwind Group",
    invoiceNumber: "INV-2026-0783",
    invoiceAmount: 3120.0,
    receivedAmount: 3118.55,
    currency: "USD",
    invoiceDate: "2026-08-19",
    settlementDate: "2026-08-27",
    daysApart: 1,
    priorOccurrences: 3,
    evidence: [
      "Invoice INV-2026-0783 issued at 3,120.00 USD, due 2026-08-26.",
      "Incoming transfer 3,118.55 USD on 2026-08-27, reference NWF-0783.",
    ],
    blockedReason: "No policy precedent on file for a short payment on this counterparty group.",
  },

  // Pattern B: Kestrel pays several invoices with one transfer.
  {
    id: "EXC-0145",
    kind: "batched_remittance",
    counterparty: "Kestrel Media Ltd",
    counterpartyGroup: "Kestrel Media Ltd",
    invoiceNumber: "INV-2026-0748",
    invoiceAmount: 5400.0,
    receivedAmount: 16200.0,
    currency: "USD",
    invoiceDate: "2026-08-04",
    settlementDate: "2026-08-18",
    daysApart: 3,
    priorOccurrences: 5,
    evidence: [
      "One incoming transfer of 16,200.00 USD on 2026-08-18, reference KESTREL-AUG.",
      "Sum of INV-2026-0748, INV-2026-0749 and INV-2026-0752 is exactly 16,200.00 USD.",
      "Kestrel has remitted in a single monthly batch for 5 closes running.",
    ],
    blockedReason: "One transfer maps to three invoices. Splitting a settlement needs a human sign off.",
  },
  {
    id: "EXC-0146",
    kind: "batched_remittance",
    counterparty: "Kestrel Media Ltd",
    counterpartyGroup: "Kestrel Media Ltd",
    invoiceNumber: "INV-2026-0749",
    invoiceAmount: 6300.0,
    receivedAmount: 16200.0,
    currency: "USD",
    invoiceDate: "2026-08-04",
    settlementDate: "2026-08-18",
    daysApart: 3,
    priorOccurrences: 5,
    evidence: [
      "Second leg of the 16,200.00 USD batch on 2026-08-18.",
      "Remittance advice attached to the transfer lists all three invoice numbers.",
    ],
    blockedReason: "One transfer maps to three invoices. Splitting a settlement needs a human sign off.",
  },
  {
    id: "EXC-0147",
    kind: "batched_remittance",
    counterparty: "Kestrel Media Ltd",
    counterpartyGroup: "Kestrel Media Ltd",
    invoiceNumber: "INV-2026-0752",
    invoiceAmount: 4500.0,
    receivedAmount: 16200.0,
    currency: "USD",
    invoiceDate: "2026-08-06",
    settlementDate: "2026-08-18",
    daysApart: 3,
    priorOccurrences: 5,
    evidence: [
      "Third leg of the 16,200.00 USD batch on 2026-08-18.",
      "Residual after the first two legs is 4,500.00 USD, an exact match.",
    ],
    blockedReason: "One transfer maps to three invoices. Splitting a settlement needs a human sign off.",
  },
  {
    id: "EXC-0159",
    kind: "batched_remittance",
    counterparty: "Kestrel Media Ltd",
    counterpartyGroup: "Kestrel Media Ltd",
    invoiceNumber: "INV-2026-0772",
    invoiceAmount: 3900.0,
    receivedAmount: 9750.0,
    currency: "USD",
    invoiceDate: "2026-08-13",
    settlementDate: "2026-08-26",
    daysApart: 2,
    priorOccurrences: 5,
    evidence: [
      "Second batch of the month, 9,750.00 USD on 2026-08-26, reference KESTREL-AUG-2.",
      "Sum of INV-2026-0772 and INV-2026-0773 is exactly 9,750.00 USD.",
    ],
    blockedReason: "One transfer maps to two invoices. Splitting a settlement needs a human sign off.",
  },
  {
    id: "EXC-0160",
    kind: "batched_remittance",
    counterparty: "Kestrel Media Ltd",
    counterpartyGroup: "Kestrel Media Ltd",
    invoiceNumber: "INV-2026-0773",
    invoiceAmount: 5850.0,
    receivedAmount: 9750.0,
    currency: "USD",
    invoiceDate: "2026-08-13",
    settlementDate: "2026-08-26",
    daysApart: 2,
    priorOccurrences: 5,
    evidence: [
      "Second leg of the 9,750.00 USD batch on 2026-08-26.",
      "Residual after the first leg is 5,850.00 USD, an exact match.",
    ],
    blockedReason: "One transfer maps to two invoices. Splitting a settlement needs a human sign off.",
  },

  // Pattern C: exact amounts that land after the close cutoff.
  {
    id: "EXC-0148",
    kind: "late_settlement",
    counterparty: "Aurora Dental Group",
    counterpartyGroup: "Aurora Dental Group",
    invoiceNumber: "INV-2026-0753",
    invoiceAmount: 2240.0,
    receivedAmount: 2240.0,
    currency: "USD",
    invoiceDate: "2026-08-06",
    settlementDate: "2026-09-02",
    daysApart: 2,
    priorOccurrences: 6,
    evidence: [
      "Amount matches to the cent, 2,240.00 USD.",
      "Settled 2 days after the 2026-08-31 cutoff, so it fell outside the period.",
      "Aurora has cleared 2 to 4 days late in every close since March.",
    ],
    blockedReason: "Amount matches but the settlement lands in the next period. Cutoff treatment is a policy call.",
  },
  {
    id: "EXC-0152",
    kind: "late_settlement",
    counterparty: "Aurora Dental Group",
    counterpartyGroup: "Aurora Dental Group",
    invoiceNumber: "INV-2026-0762",
    invoiceAmount: 1180.0,
    receivedAmount: 1180.0,
    currency: "USD",
    invoiceDate: "2026-08-10",
    settlementDate: "2026-09-03",
    daysApart: 3,
    priorOccurrences: 6,
    evidence: [
      "Amount matches to the cent, 1,180.00 USD.",
      "Settled 3 days after the cutoff.",
    ],
    blockedReason: "Amount matches but the settlement lands in the next period. Cutoff treatment is a policy call.",
  },
  {
    id: "EXC-0157",
    kind: "late_settlement",
    counterparty: "Brightline Studios",
    counterpartyGroup: "Brightline Studios",
    invoiceNumber: "INV-2026-0768",
    invoiceAmount: 3650.0,
    receivedAmount: 3650.0,
    currency: "USD",
    invoiceDate: "2026-08-11",
    settlementDate: "2026-09-02",
    daysApart: 2,
    priorOccurrences: 2,
    evidence: [
      "Amount matches to the cent, 3,650.00 USD.",
      "Settled 2 days after the cutoff, first time for this counterparty.",
    ],
    blockedReason: "Amount matches but the settlement lands in the next period. Cutoff treatment is a policy call.",
  },
  {
    id: "EXC-0164",
    kind: "late_settlement",
    counterparty: "Brightline Studios",
    counterpartyGroup: "Brightline Studios",
    invoiceNumber: "INV-2026-0779",
    invoiceAmount: 890.0,
    receivedAmount: 890.0,
    currency: "USD",
    invoiceDate: "2026-08-18",
    settlementDate: "2026-09-04",
    daysApart: 4,
    priorOccurrences: 2,
    evidence: [
      "Amount matches to the cent, 890.00 USD.",
      "Settled 4 days after the cutoff, the widest lag in this pattern.",
    ],
    blockedReason: "Amount matches but the settlement lands in the next period. Cutoff treatment is a policy call.",
  },

  // Pattern D: the processor charged the same fee twice.
  {
    id: "EXC-0150",
    kind: "duplicate_fee",
    counterparty: "Vantage Payments",
    counterpartyGroup: "Vantage Payments",
    invoiceNumber: "FEE-2026-0812",
    invoiceAmount: 0,
    receivedAmount: -184.5,
    currency: "USD",
    invoiceDate: "2026-08-12",
    settlementDate: "2026-08-12",
    daysApart: 0,
    priorOccurrences: 1,
    evidence: [
      "Two debits of 184.50 USD on 2026-08-12 with the same processor batch id.",
      "Only one fee accrual exists in the ledger for that batch.",
    ],
    blockedReason: "A duplicate debit may be a real second charge. Reversing it without a human is not safe.",
  },
  {
    id: "EXC-0161",
    kind: "duplicate_fee",
    counterparty: "Vantage Payments",
    counterpartyGroup: "Vantage Payments",
    invoiceNumber: "FEE-2026-0821",
    invoiceAmount: 0,
    receivedAmount: -96.2,
    currency: "USD",
    invoiceDate: "2026-08-21",
    settlementDate: "2026-08-21",
    daysApart: 0,
    priorOccurrences: 1,
    evidence: [
      "Two debits of 96.20 USD on 2026-08-21 with the same processor batch id.",
      "Support ticket VP-88214 open with the processor since 2026-08-22.",
    ],
    blockedReason: "A duplicate debit may be a real second charge. Reversing it without a human is not safe.",
  },
  {
    id: "EXC-0167",
    kind: "duplicate_fee",
    counterparty: "Rhodes Freight Services",
    counterpartyGroup: "Rhodes Freight Services",
    invoiceNumber: "FEE-2026-0827",
    invoiceAmount: 0,
    receivedAmount: -42.0,
    currency: "USD",
    invoiceDate: "2026-08-27",
    settlementDate: "2026-08-27",
    daysApart: 0,
    priorOccurrences: 0,
    evidence: [
      "Two wire fees of 42.00 USD on 2026-08-27 against one outgoing payment.",
      "No prior occurrence for this counterparty.",
    ],
    blockedReason: "A duplicate debit may be a real second charge. Reversing it without a human is not safe.",
  },

  // Pattern E: the money arrived, the reference did not.
  {
    id: "EXC-0153",
    kind: "reference_mismatch",
    counterparty: "Solano Ceramics SL",
    counterpartyGroup: "Solano Ceramics SL",
    invoiceNumber: "INV-2026-0764",
    invoiceAmount: 1975.0,
    receivedAmount: 1975.0,
    currency: "USD",
    invoiceDate: "2026-08-09",
    settlementDate: "2026-08-19",
    daysApart: 0,
    priorOccurrences: 2,
    evidence: [
      "Amount matches to the cent, 1,975.00 USD.",
      "Payment reference reads PO-44127, which is the purchase order, not the invoice number.",
      "The purchase order maps to exactly one open invoice.",
    ],
    blockedReason: "Matching on a purchase order instead of an invoice number needs a stated policy.",
  },
  {
    id: "EXC-0156",
    kind: "reference_mismatch",
    counterparty: "Solano Ceramics SL",
    counterpartyGroup: "Solano Ceramics SL",
    invoiceNumber: "INV-2026-0767",
    invoiceAmount: 2430.0,
    receivedAmount: 2430.0,
    currency: "USD",
    invoiceDate: "2026-08-11",
    settlementDate: "2026-08-21",
    daysApart: 0,
    priorOccurrences: 2,
    evidence: [
      "Amount matches to the cent, 2,430.00 USD.",
      "Payment reference reads PO-44163, again a purchase order.",
    ],
    blockedReason: "Matching on a purchase order instead of an invoice number needs a stated policy.",
  },
  {
    id: "EXC-0168",
    kind: "reference_mismatch",
    counterparty: "Halcyon Print Co",
    counterpartyGroup: "Halcyon Print Co",
    invoiceNumber: "INV-2026-0786",
    invoiceAmount: 615.0,
    receivedAmount: 615.0,
    currency: "USD",
    invoiceDate: "2026-08-20",
    settlementDate: "2026-08-28",
    daysApart: 0,
    priorOccurrences: 0,
    evidence: [
      "Amount matches to the cent, 615.00 USD.",
      "Reference field is blank, the sender name is the only identifier.",
    ],
    blockedReason: "Nothing but the amount and the sender name ties this to an invoice.",
  },

  // Pattern F: real currency movement, not rounding.
  {
    id: "EXC-0154",
    kind: "fx_difference",
    counterparty: "Solano Ceramics SL",
    counterpartyGroup: "Solano Ceramics SL",
    invoiceNumber: "INV-2026-0765",
    invoiceAmount: 8420.0,
    receivedAmount: 8407.6,
    currency: "USD",
    invoiceDate: "2026-08-09",
    settlementDate: "2026-08-24",
    daysApart: 6,
    priorOccurrences: 1,
    evidence: [
      "Shortfall of 12.40 USD, 0.15 percent of the invoice.",
      "EUR moved 0.4 percent between invoice date and settlement date.",
      "Too large for the rounding band, small enough to be a rate move.",
    ],
    blockedReason: "Above the tolerance any current precedent allows. Needs a decision on FX variance treatment.",
  },
  {
    id: "EXC-0165",
    kind: "fx_difference",
    counterparty: "Fiorella Tessuti Srl",
    counterpartyGroup: "Fiorella Tessuti Srl",
    invoiceNumber: "INV-2026-0781",
    invoiceAmount: 5290.0,
    receivedAmount: 5281.25,
    currency: "USD",
    invoiceDate: "2026-08-18",
    settlementDate: "2026-08-29",
    daysApart: 4,
    priorOccurrences: 1,
    evidence: [
      "Shortfall of 8.75 USD, 0.17 percent of the invoice.",
      "EUR moved 0.3 percent over the settlement window.",
    ],
    blockedReason: "Above the tolerance any current precedent allows. Needs a decision on FX variance treatment.",
  },
];

/** Invoice amount minus what actually landed. Positive means we were paid short. */
export function shortfall(exception: ReconException): number {
  return Math.round((exception.invoiceAmount - exception.receivedAmount) * 100) / 100;
}

export function shortfallPct(exception: ReconException): number {
  if (exception.invoiceAmount === 0) return 0;
  return Math.abs(shortfall(exception) / exception.invoiceAmount) * 100;
}

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
