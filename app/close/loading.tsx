// The close screen while its data is being read. It holds the same rhythm the
// real screen has (kicker, heading, standfirst, autonomy meter, ruled rows) so
// nothing jumps when the queue arrives. No spinner: a letterpress page does not
// have one, and a still skeleton reads as a page setting itself rather than as
// something being waited on.

export default function LoadingClose() {
  return (
    <div
      role="status"
      aria-label="Loading the August 2026 close queue"
      className="mx-auto max-w-5xl px-5 py-10"
    >
      <div className="h-3 w-56 bg-surface" />
      <div className="mt-4 h-9 w-[18rem] bg-surface sm:w-[22rem]" />

      <div className="mt-6 space-y-2">
        <div className="h-3 w-full max-w-[68ch] bg-surface" />
        <div className="h-3 w-full max-w-[62ch] bg-surface" />
        <div className="h-3 w-3/4 max-w-[48ch] bg-surface" />
      </div>

      {/* The autonomy meter, empty until the queue is counted. */}
      <div className="mt-5 h-2 w-full border border-border bg-surface" />
      <div className="mt-3 h-3 w-full max-w-[52ch] bg-surface" />

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="h-9 w-[11rem] border border-border bg-surface" />
        <div className="h-9 w-[8.5rem] border border-border bg-surface" />
      </div>

      <div className="obiter-rule mt-10" />

      <ul className="mt-2">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <li key={row} className="obiter-rule flex items-center gap-3 py-4">
            <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
              <span className="order-1 h-3 w-[5.5rem] shrink-0 bg-surface" />
              <span className="order-3 h-3 w-full bg-surface sm:order-2 sm:w-auto sm:min-w-[13rem] sm:flex-1" />
              <span className="order-4 h-3 w-2/5 bg-surface sm:order-3 sm:w-[9.5rem] sm:shrink-0" />
              <span className="order-2 ml-auto h-3 w-[7rem] shrink-0 bg-surface sm:order-4 sm:ml-0" />
            </span>
            <span className="h-3 w-[4.5rem] shrink-0 bg-surface" />
          </li>
        ))}
      </ul>
    </div>
  );
}
