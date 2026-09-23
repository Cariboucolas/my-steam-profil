import Svg, { Circle, G, Path } from "react-native-svg";

import { NOT_READ } from "../../accessibility/not-read";
import { MARK_STOPS, MARK_TIP, MARK_TRACK } from "../../theme/mark";
import { colors } from "../../theme/tokens";

export const MARK_TRACK_TEST_ID = "brand-mark-track";
export const MARK_STOP_TEST_ID = "brand-mark-stop";
export const MARK_TIP_TEST_ID = "brand-mark-tip";

/**
 * The coordinate space the mark was drawn in. Every figure below is read off
 * the Claude Design mock unchanged, so that following the design later means
 * copying numbers rather than deriving them again.
 */
const CANVAS = 512;
const CENTRE = CANVAS / 2;
const RADIUS = 132;
const STROKE = 52;
/** The mark sits inside its own canvas, which is what leaves the icon its margin. */
const INSET = 0.82;

/** The hub at the centre: the accent itself, at full strength. */
const HUB_RADIUS = 30;

const TIP_DASH = "23.5 830";
const TIP_OFFSET = -540.9;
const BEVEL = "M256 98 284 124 256 150Z";
const BEVEL_ROTATION = 245;

/** Each stop is a single round-capped dash, one step further round than the last. */
const STOP_DASH = "31.5 830";

/** SVG arcs start at 3 o'clock; the mark starts at 12. */
const START_AT_TOP = `rotate(-90 ${CENTRE} ${CENTRE})`;

type Props = {
  /** Drawn edge to edge at this many points. */
  readonly size: number;
  /**
   * How many of the arc's stops to draw, from the darkest end. Anything
   * outside the arc's own length is clamped, so a caller driving this from a
   * clock never has to.
   */
  readonly stops: number;
  /** Whether the bright tip and its bevel close the arc. */
  readonly tip: boolean;
};

/**
 * The app's mark: a completion ring with a bevelled tip and a hub.
 *
 * Deliberately not `CompletionRing`. That component answers a question about a
 * game — *this one is N% complete* — and stays a single arc in a single colour
 * because that is all the question needs. This is an identity, and its twelve
 * stops, its bevel and its hub mean nothing about anything. Two shallow
 * components, rather than one carrying both meanings behind a flag.
 *
 * It draws what it is told and owns no clock of its own. What makes it move
 * lives in `splash-timing`, which can be reasoned about without rendering
 * anything.
 */
export function BrandMark({ size, stops, tip }: Props) {
  const shown = Math.min(MARK_STOPS.length, Math.max(0, Math.floor(stops)));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`} {...NOT_READ}>
      <G
        transform={`translate(${CENTRE} ${CENTRE}) scale(${INSET}) translate(-${CENTRE} -${CENTRE})`}
      >
        <Circle
          testID={MARK_TRACK_TEST_ID}
          cx={CENTRE}
          cy={CENTRE}
          r={RADIUS}
          fill="none"
          stroke={MARK_TRACK}
          strokeWidth={STROKE}
        />

        {MARK_STOPS.slice(0, shown).map((stop) => (
          <Circle
            key={stop.color}
            testID={MARK_STOP_TEST_ID}
            cx={CENTRE}
            cy={CENTRE}
            r={RADIUS}
            fill="none"
            stroke={stop.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={STOP_DASH}
            strokeDashoffset={stop.dashOffset}
            transform={START_AT_TOP}
          />
        ))}

        {tip ? (
          <>
            <Circle
              testID={MARK_TIP_TEST_ID}
              cx={CENTRE}
              cy={CENTRE}
              r={RADIUS}
              fill="none"
              stroke={MARK_TIP}
              strokeWidth={STROKE}
              strokeDasharray={TIP_DASH}
              strokeDashoffset={TIP_OFFSET}
              transform={START_AT_TOP}
            />
            <Path
              d={BEVEL}
              fill={MARK_TIP}
              transform={`rotate(${BEVEL_ROTATION} ${CENTRE} ${CENTRE})`}
            />
          </>
        ) : null}

        <Circle cx={CENTRE} cy={CENTRE} r={HUB_RADIUS} fill={colors.accent} />
      </G>
    </Svg>
  );
}
