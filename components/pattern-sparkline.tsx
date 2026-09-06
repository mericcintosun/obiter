// The shape of the residue, drawn from the queue rather than described.
//
// Six patterns, one point each, height proportional to how many rows are still
// open under that pattern. Every count is passed in from app/page.tsx, which
// groups getCloseState().open by kind on the server. Nothing here is hardcoded
// and nothing here is fetched: this component takes numbers and draws them.
//
// The drawing is aria-hidden on purpose. The ruled list under it carries the
// same six numbers as text, so a screen reader gets the figures once, in the
// order the chart draws them, instead of an alt sentence that repeats the list.
//
// The stroke reveals under the same M4 wipe as everything else on the page: the
// SectionEntrance around section 1 applies .obiter-wipe, whose clip-path inset
// sweeps this SVG left to right along with the rest of the section. There is no
// second animation and no second keyframe.

interface Pattern {
  kind: string;
  /** The human label from exceptionKindLabels in lib/data.ts. */
  label: string;
  /** Open rows under this pattern right now. */
  count: number;
}

interface Props {
  patterns: Pattern[];
}

const BASELINE = 82;
const TOP = 18;
const LEFT = 32;
const RIGHT = 608;

export function PatternSparkline({ patterns }: Props) {
  // Math.max with 1 so a fully cleared queue divides by something.
  const tallest = Math.max(1, ...patterns.map((pattern) => pattern.count));
  const span = patterns.length > 1 ? (RIGHT - LEFT) / (patterns.length - 1) : 0;

  const points = patterns.map((pattern, index) => ({
    ...pattern,
    x: patterns.length > 1 ? LEFT + index * span : (LEFT + RIGHT) / 2,
    y: BASELINE - (pattern.count / tallest) * (BASELINE - TOP),
  }));

  return (
    <figure className="obiter-measure mt-6">
      <svg
        viewBox="0 0 640 100"
        width="640"
        height="100"
        aria-hidden="true"
        className="h-auto w-full"
      >
        <g className="text-border">
          <line x1="16" y1={BASELINE} x2="624" y2={BASELINE} stroke="currentColor" strokeWidth="1" />
          {points.map((point) => (
            <line
              key={`stem-${point.kind}`}
              x1={point.x}
              y1={BASELINE}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
        </g>
        <g className="text-ink">
          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          {points.map((point) => (
            <circle key={`dot-${point.kind}`} cx={point.x} cy={point.y} r="3.25" fill="currentColor" />
          ))}
        </g>
      </svg>

      <figcaption className="obiter-plate-caption">
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {points.map((point) => (
            <li key={point.kind}>
              <span className="obiter-figure font-medium text-ink">{point.count}</span>{" "}
              {point.label}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
