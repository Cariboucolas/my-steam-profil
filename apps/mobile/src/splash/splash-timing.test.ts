import {
  FIRST_STOP_MS,
  HOLD_MS,
  REVEAL_MS,
  STOP_INTERVAL_MS,
  holdFor,
  stopsShownAt,
  tipIsShownAt,
} from "./splash-timing";
import { MARK_STOP_COUNT } from "../theme/mark";

describe("holdFor", () => {
  /**
   * The stage waits for real work — fonts, and the device store's answer — but
   * a warm start finishes that in a couple of hundred milliseconds, which would
   * cut the mark off part-drawn. The floor is what makes the reveal whole.
   */
  it("holds long enough for the whole reveal to land", () => {
    expect(holdFor(false)).toBeGreaterThanOrEqual(REVEAL_MS);
  });

  /**
   * A player who asked their device for less motion is not asking to wait
   * longer for it. The mark is drawn whole and the stage lasts exactly as long
   * as the work behind it.
   */
  it("holds for nothing at all when the device asked for less motion", () => {
    expect(holdFor(true)).toBe(0);
  });

  /**
   * The device can only be asked asynchronously. Until it answers, holding is
   * the choice that can be taken back: a stage held a moment too long is
   * invisible, where motion shown to someone who asked for none is the failure
   * the setting exists to prevent.
   */
  it("holds while the device has yet to say", () => {
    expect(holdFor(undefined)).toBe(holdFor(false));
  });
});

describe("stopsShownAt", () => {
  it("draws no arc before the first stop is due", () => {
    expect(stopsShownAt(0)).toBe(0);
    expect(stopsShownAt(FIRST_STOP_MS - 1)).toBe(0);
  });

  it("draws the first stop when it falls due", () => {
    expect(stopsShownAt(FIRST_STOP_MS)).toBe(1);
  });

  it("adds one stop per interval", () => {
    expect(stopsShownAt(FIRST_STOP_MS + STOP_INTERVAL_MS)).toBe(2);
    expect(stopsShownAt(FIRST_STOP_MS + STOP_INTERVAL_MS * 2)).toBe(3);
  });

  /** Between two stops the arc holds still: the reveal is stepped, not swept. */
  it("holds a stop until the next one is due", () => {
    expect(stopsShownAt(FIRST_STOP_MS + STOP_INTERVAL_MS - 1)).toBe(1);
  });

  it("has drawn every stop by the time the reveal is over", () => {
    expect(stopsShownAt(REVEAL_MS)).toBe(MARK_STOP_COUNT);
  });

  /**
   * The stage outlasts the reveal whenever the work behind it does, so the
   * schedule has to answer for a time past its own end rather than run on.
   */
  it("draws no more than the arc has", () => {
    expect(stopsShownAt(REVEAL_MS * 10)).toBe(MARK_STOP_COUNT);
  });

  /** A clock that goes backwards is a bug elsewhere, not an arc drawn in reverse. */
  it("draws nothing for a time before the stage began", () => {
    expect(stopsShownAt(-1000)).toBe(0);
  });
});

describe("tipIsShownAt", () => {
  /**
   * The bright tip and its bevel close the arc, so they land after the last
   * stop rather than with it — otherwise the mark finishes before it is full.
   */
  it("is not shown while stops are still arriving", () => {
    expect(tipIsShownAt(FIRST_STOP_MS)).toBe(false);
    expect(tipIsShownAt(REVEAL_MS - 1)).toBe(false);
  });

  it("closes the arc once every stop has landed", () => {
    expect(tipIsShownAt(REVEAL_MS)).toBe(true);
  });
});

describe("the stage as a whole", () => {
  /**
   * The wordmark rises under a mark that is still drawing, so the two read as
   * one movement rather than as a sequence.
   */
  it("holds for longer than it takes to draw the mark", () => {
    expect(HOLD_MS).toBeGreaterThan(REVEAL_MS);
  });
});
