"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// A section that wipes in when it reaches the reader.
//
// The entrance is the existing .obiter-wipe class and nothing else: the M4
// clip-path inset reveal at 600ms on the identity's own easing, already defined
// in app/globals.css and already disabled inside the prefers-reduced-motion
// block there. This file adds no keyframe, no duration and no easing of its own,
// and it never sets an inline delay: stagger, where the queue wants one, rides
// nth-child in the stylesheet.
//
// The content is always in the server HTML. The observer only adds a class, so a
// reader with JavaScript off, or a crawler, gets the whole page rendered and
// static. That is the difference between an entrance and a reveal, and it is why
// this component is named for what it does to a section rather than for hiding
// something.

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function SectionEntrance({ children, className }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No observer means no entrance, not a hidden section.
    if (typeof IntersectionObserver === "undefined") {
      setEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setEntered(true);
          observer.disconnect();
        }
      },
      // A little short of the viewport edge, so the wipe starts as the section
      // arrives rather than after the reader is already looking at it.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={cn(className, entered && "obiter-wipe")}>
      {children}
    </section>
  );
}
