import { act, renderHook } from "@testing-library/react-native";
import type { ScrollView } from "react-native";

import { useUnlockCalendarScroll } from "./use-unlock-calendar-scroll";

/** The gap the card leaves between two month rows. */
const ROW_GAP = 4;

/** A scroll as the grid reports one: how far down the reader has moved it. */
const scrolledTo = (y: number) => ({ nativeEvent: { contentOffset: { y } } });

const scrollOf = (monthsDrawn: number) =>
  renderHook(() => useUnlockCalendarScroll(monthsDrawn, ROW_GAP));

describe("useUnlockCalendarScroll", () => {
  it("leaves a year the card can hold whole alone", () => {
    expect(scrollOf(6).result.current.scrolls).toBe(false);
    expect(scrollOf(7).result.current.scrolls).toBe(true);
  });

  /**
   * A December of twelve ten-pixel rows four pixels apart measures 164, and
   * the six rows the card holds itself to come to 80 of that. It holds no
   * height at all until the grid has been measured: a row's height is not a
   * number this knows, it is one it is told.
   */
  it("holds six rows of the height it is told the year took", () => {
    const { result } = scrollOf(12);

    expect(result.current.height).toBeUndefined();

    act(() => result.current.onContentSizeChange(320, 164));

    expect(result.current.height).toBe(80);
  });

  /**
   * That same December: 164 pixels of grid seen 80 at a time. At rest the
   * reader is at the top, so only the bottom has more year beyond it; scrolled
   * the whole 84 they are in the second half, and only the top has.
   */
  it("follows the reader down the year", () => {
    const { result } = scrollOf(12);
    act(() => result.current.onContentSizeChange(320, 164));

    expect(result.current.half).toBe(0);
    expect(result.current.fades).toEqual({ top: false, bottom: true });

    act(() => result.current.onScroll(scrolledTo(84)));

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
    act(() => result.current.onContentSizeChange(320, 164));

    // Asked before the grid is there to be moved, it asks nothing of nothing.
    result.current.goToHalf(1);
    expect(scrollTo).not.toHaveBeenCalled();

    result.current.ref.current = { scrollTo } as unknown as ScrollView;

    result.current.goToHalf(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 84, animated: true });

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
