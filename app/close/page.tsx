import type { Metadata } from "next";
import { CloseQueue } from "@/components/close-queue";
import { getCloseState } from "@/lib/adapters";

export const metadata: Metadata = {
  title: "Close queue, August 2026",
  description:
    "24 open reconciliation exceptions. Resolve one and Obiter compiles the decision into a named rule, then applies it to the rest of the queue.",
};

export default async function ClosePage() {
  const { summary, carried, open } = await getCloseState();

  return <CloseQueue initialQueue={open} summary={summary} carried={carried} />;
}
