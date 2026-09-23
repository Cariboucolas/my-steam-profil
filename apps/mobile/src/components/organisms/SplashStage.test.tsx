import { act, render, screen } from "@testing-library/react-native";

import { SplashStage, SPLASH_WORDMARK } from "./SplashStage";
import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
  letTheDeviceAnswer,
} from "../../accessibility/reduce-motion.test-support";
import {
  HOLD_MS,
  MARK_STOP_COUNT,
  REVEAL_MS,
} from "../../splash/splash-timing";
import {
  MARK_STOP_TEST_ID,
  MARK_TIP_TEST_ID,
  MARK_TRACK_TEST_ID,
} from "../atoms/BrandMark";

/** The mark is hidden from the accessibility tree; structural queries say so. */
const DRAWN = { includeHiddenElements: true } as const;

const stopsDrawn = (): number =>
  screen.queryAllByTestId(MARK_STOP_TEST_ID, DRAWN).length;

const wait = (ms: number): void => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

describe("SplashStage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("while the device is fine with motion", () => {
    beforeEach(() => {
      deviceIsFineWithMotion();
    });

    /**
     * The unlit ring is the whole shape from the first frame. Growing the mark
     * as well as filling it would read as two movements where the design has
     * one.
     */
    it("draws the mark's track before anything has been revealed", async () => {
      render(<SplashStage ready={false} onDone={jest.fn()} />);
      await letTheDeviceAnswer();

      expect(screen.getByTestId(MARK_TRACK_TEST_ID, DRAWN)).toBeTruthy();
      expect(stopsDrawn()).toBe(0);
    });

    it("fills the arc as the stage runs", async () => {
      render(<SplashStage ready={false} onDone={jest.fn()} />);
      await letTheDeviceAnswer();

      wait(REVEAL_MS / 2);
      const halfway = stopsDrawn();
      expect(halfway).toBeGreaterThan(0);
      expect(halfway).toBeLessThan(MARK_STOP_COUNT);

      wait(REVEAL_MS);
      expect(stopsDrawn()).toBe(MARK_STOP_COUNT);
      expect(screen.getByTestId(MARK_TIP_TEST_ID, DRAWN)).toBeTruthy();
    });

    it("names the app to a reader who is listening", async () => {
      render(<SplashStage ready={false} onDone={jest.fn()} />);
      await letTheDeviceAnswer();

      expect(screen.getByText(SPLASH_WORDMARK)).toBeTruthy();
    });

    /**
     * The stage covers real work. Giving way before that work is done would
     * show the screen underneath with nothing on it, which is the flash the
     * stage exists to cover.
     */
    it("holds while the work behind it is unfinished", async () => {
      const onDone = jest.fn();
      render(<SplashStage ready={false} onDone={onDone} />);
      await letTheDeviceAnswer();

      wait(HOLD_MS * 4);

      expect(onDone).not.toHaveBeenCalled();
    });

    /**
     * A warm start finishes the work in a couple of hundred milliseconds. Left
     * to it, the stage would vanish with the mark part-drawn — which reads as a
     * glitch rather than as a fast launch.
     */
    it("holds after the work is done, so the reveal is never cut short", async () => {
      const onDone = jest.fn();
      render(<SplashStage ready onDone={onDone} />);
      await letTheDeviceAnswer();

      wait(REVEAL_MS / 2);
      expect(onDone).not.toHaveBeenCalled();

      wait(HOLD_MS);
      expect(onDone).toHaveBeenCalled();
    });

    it("gives way once the work is done and the stage has run its course", async () => {
      const onDone = jest.fn();
      const view = render(<SplashStage ready={false} onDone={onDone} />);
      await letTheDeviceAnswer();

      wait(HOLD_MS * 2);
      expect(onDone).not.toHaveBeenCalled();

      view.rerender(<SplashStage ready onDone={onDone} />);
      wait(0);

      expect(onDone).toHaveBeenCalled();
    });

    /** The parent unmounts on the first call; a second would be a leak. */
    it("gives way once and not again", async () => {
      const onDone = jest.fn();
      render(<SplashStage ready onDone={onDone} />);
      await letTheDeviceAnswer();

      wait(HOLD_MS * 5);

      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe("when the device asked for less motion", () => {
    beforeEach(() => {
      deviceAsksForLessMotion();
    });

    /**
     * There is no reveal to protect, so there is nothing to hold for. The mark
     * is the app's, and it is drawn whole.
     */
    it("draws the mark whole from the first frame", async () => {
      render(<SplashStage ready={false} onDone={jest.fn()} />);
      await letTheDeviceAnswer();

      expect(stopsDrawn()).toBe(MARK_STOP_COUNT);
      expect(screen.getByTestId(MARK_TIP_TEST_ID, DRAWN)).toBeTruthy();
    });

    /** Asking for less motion is not asking to wait longer for it. */
    it("gives way as soon as the work is done", async () => {
      const onDone = jest.fn();
      render(<SplashStage ready onDone={onDone} />);
      await letTheDeviceAnswer();

      wait(0);

      expect(onDone).toHaveBeenCalled();
    });

    it("still holds while the work behind it is unfinished", async () => {
      const onDone = jest.fn();
      render(<SplashStage ready={false} onDone={onDone} />);
      await letTheDeviceAnswer();

      wait(HOLD_MS * 4);

      expect(onDone).not.toHaveBeenCalled();
    });
  });

  /**
   * The device can only be asked asynchronously. Until it answers, the stage
   * behaves as though motion were wanted: a stage held a moment too long is
   * invisible, where motion shown to someone who asked for none is the whole
   * of what the setting exists to prevent.
   */
  it("does not give way before the device has said what it wants", () => {
    deviceAsksForLessMotion();
    const onDone = jest.fn();
    render(<SplashStage ready onDone={onDone} />);

    wait(0);

    expect(onDone).not.toHaveBeenCalled();
  });
});
