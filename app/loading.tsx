// The landing page while its counts are being read. `app/page.tsx` is
// force-dynamic because the open exception count comes from the close journal,
// so there is a real wait here and it deserves a named branch rather than a
// blank screen.
//
// Same rule as the close skeleton: the rhythm of the real page (kicker,
// headline, two paragraphs, the figure, one button) in flat surface blocks, no
// spinner, no new keyframe, tokens only.

export default function HomeSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading the Obiter landing page"
      className="mx-auto max-w-[68ch] px-5 pt-14 pb-4"
    >
      {/* Kicker */}
      <div className="h-3 w-64 max-w-full bg-surface" />

      {/* Headline, two lines at the display size */}
      <div className="mt-5 h-10 w-full bg-surface sm:h-12" />
      <div className="mt-2 h-10 w-4/5 bg-surface sm:h-12" />

      {/* Standfirst */}
      <div className="mt-7 space-y-2.5">
        <div className="h-4 w-full bg-surface" />
        <div className="h-4 w-full bg-surface" />
        <div className="h-4 w-3/4 bg-surface" />
      </div>

      <div className="obiter-rule mt-10" />

      {/* Second paragraph */}
      <div className="mt-10 space-y-2.5">
        <div className="h-4 w-full bg-surface" />
        <div className="h-4 w-full bg-surface" />
        <div className="h-4 w-2/3 bg-surface" />
      </div>

      {/* The ruled figure, at the same border and width the illustration has */}
      <div className="mt-10 h-[180px] w-full border border-border bg-surface sm:h-[240px]" />
      <div className="mt-3 h-3 w-3/5 bg-surface" />

      {/* The one call to action, into the close queue */}
      <div className="mt-10 h-11 w-[19rem] max-w-full border border-border bg-surface" />
      <div className="mt-3 h-3 w-1/2 bg-surface" />
    </div>
  );
}
