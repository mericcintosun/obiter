"use client";

import { useEffect, useState } from "react";

// A figure that counts up to its real value inside a sentence.
//
// Three rules this obeys, in order of how much they matter:
//
//   1. The final number is in the server HTML. useState is seeded with the real
//      value, so the first client render matches the server render and a reader
//      with no JavaScript, or a crawler, sees 61 rather than 0.
//   2. The animation only replaces the number while it is running. It counts
//      from 0 back up to the same value over 600ms, the M4 duration, and then
//      stops on the number that was already there.
//   3. Under prefers-reduced-motion: reduce it never animates at all. The effect
//      reads the media query and returns before touching state.
//
// The value is passed in from the server, computed from getCloseState(). This
// component never knows what the number means and never has a literal of its
// own.

interface Props {
  /** The real figure, already computed from the close state. */
  value: number;
  /** Printed after the number, for example "percent". Optional. */
  unit?: string;
}

const DURATION_MS = 600;

export function CountedFigure({ value, unit }: Props) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof window.requestAnimationFrame !== "function") return;

    let frame = 0;
    const started = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - started) / DURATION_MS, 1);
      // The same shape as the wipe's cubic-bezier: fast out of the gate, settled
      // at the end, so the count and the rules on screen feel like one motion.
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className="obiter-figure font-medium">
      {shown}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}
