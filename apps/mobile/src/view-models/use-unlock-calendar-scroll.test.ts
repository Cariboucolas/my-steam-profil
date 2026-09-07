import { act, renderHook } from "@testing-library/react-native";
import type { ScrollView } from "react-native";

import {
  DECEMBER_HEIGHT,
  ROW_GAP,
  SCROLLED_PAST,
  scrolledTo,
  SIX_ROWS,
} from "./unlock-calendar-scroll.test-support";
import { useUnlockCalendarScroll } from "./use-unlock-calendar-scroll";

const scrollOf = (monthsDrawn: number) =>
  renderHook(() => useUnlockCalendarScroll(monthsDrawn, ROW_GAP));

describe("useUnlockCalendarScroll", () => {
  it("leaves a year the card can hold whole alone", () => {
    expect(scrollOf(6).result.current.scrolls).toBe(false);
    expect(scrollOf(7).result.current.scrolls).toBe(true);
  });

  /**
   * It holds no height at all until the grid has been measured: a row's
   * height is not a number this knows, it is one it is told.
   */
  it("holds six rows of the height it is told the year took", () => {
    const { result } = scrollOf(12);

    expect(result.current.height).toBeUndefined();

    act(() => result.current.onContentSizeChange(320, DECEMBER_HEIGHT));

    expect(result.current.height).toBe(SIX_ROWS);
  });

  /**
   * At rest the reader is at the top of the December, so only the bottom has
   * more year beyond it; scrolled the whole of it they are in the second
   * half, and only the top has.
   */
  it("follows the reader down the year", () => {
    const { result } = scrollOf(12);
    act(() => result.current.onContentSizeChange(320, DECEMBER_HEIGHT));

    expect(result.current.half).toBe(0);
    expect(result.current.fades).toEqual({ top: false, bottom: true });

    act(() => result.current.onScroll(scrolledTo(SCROLLED_PAST)));

    expect(result.current.half).toBe(1);
    expect(result.current.fades).toEqual({ top: true, bottom: false });
  });

  /**
   * What a pressed dot does. The grid is moved through the very scroll the
   * finger moves, so a pointer and a finger reach the same two places: the top
   * of the year, and as far down as the year goes.
   */
  it("moves the grid to the half it is asked for", () => {
    const scrollTo = jest.fn();
    const { result } = scrollOf(12);
    act(() => result.current.onContentSizeChange(320, DECEMBER_HEIGHT));

    // Asked before the grid is there to be moved, it asks nothing of nothing.
    result.current.goToHalf(1);
    expect(scrollTo).not.toHaveBeenCalled();

    result.current.ref.current = { scrollTo } as unknown as ScrollView;

    result.current.goToHalf(1);
    expect(scrollTo).toHaveBeenCalledWith({
      y: SCROLLED_PAST,
      animated: true,
    });

    result.current.goToHalf(0);
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: true });
  });

  /** Nothing is claimed about a grid that has not said how tall it is. */
  it("marks no edge of a grid it has not been told the size of", () => {
    const { result } = scrollOf(12);

    expect(result.current.fades).toEqual({ top: false, bottom: false });
    expect(result.current.half).toBe(0);
  });
});
