import { act, renderHook } from "@testing-library/react-native";
import type { ScrollViewInstance } from "react-native";

import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
  letTheDeviceAnswer,
} from "../accessibility/reduce-motion.test-support";
import type { LayoutReport } from "./scroll-reports";
import { useStatsScroll } from "./use-stats-scroll";

const laidOut = (y: number, height: number): LayoutReport => ({
  nativeEvent: { layout: { y, height } },
});
const scrolledTo = (y: number) => ({ nativeEvent: { contentOffset: { y } } });

/** The page of the pure rules' tests: years at 108, week at 508, 1000 of page seen through 500. */
const measuredPage = async () => {
  const hook = await renderHook(() => useStatsScroll(["years", "week"]));
  await letTheDeviceAnswer();
  const { binding } = hook.result.current;
  await act(() => {
    binding.onLayout(laidOut(0, 500));
    binding.onContentSizeChange(390, 1000);
    binding.onChipRowLayout(laidOut(60, 48));
    binding.onCardLayout("years")(laidOut(108, 400));
    binding.onCardLayout("week")(laidOut(508, 300));
  });
  return hook;
};

describe("useStatsScroll", () => {
  it("follows the card in view as the page scrolls", async () => {
    const { result } = await measuredPage();
    expect(result.current.active).toBe("years");

    await act(() => result.current.binding.onScroll(scrolledTo(460)));
    expect(result.current.active).toBe("week");
  });

  it("moves the page until the card's top sits under the chip row", async () => {
    deviceIsFineWithMotion();
    const { result } = await measuredPage();
    const scrollTo = jest.fn();
    result.current.binding.ref.current = { scrollTo } as unknown as ScrollViewInstance;

    result.current.goTo("week");
    expect(scrollTo).toHaveBeenCalledWith({ y: 460, animated: true });
  });

  it("jumps rather than glides for a player who asked for less motion", async () => {
    deviceAsksForLessMotion();
    const { result } = await measuredPage();
    const scrollTo = jest.fn();
    result.current.binding.ref.current = { scrollTo } as unknown as ScrollViewInstance;

    result.current.goTo("years");
    expect(scrollTo).toHaveBeenCalledWith({ y: 60, animated: false });
  });
});
