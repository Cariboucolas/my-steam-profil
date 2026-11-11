import { act, renderHook } from "@testing-library/react-native";
import type { ScrollViewInstance } from "react-native";

import {
  deviceAsksForLessMotion,
  deviceIsFineWithMotion,
  letTheDeviceAnswer,
} from "../accessibility/reduce-motion.test-support";
import type { SideLayoutReport } from "./scroll-reports";
import { useChipRowScroll } from "./use-chip-row-scroll";

const MARGIN = 20;

const laidOut = (x: number, width: number): SideLayoutReport => ({
  nativeEvent: { layout: { x, width } },
});

/** A row 300 wide holding three chips, the last one past its right edge. */
const measuredRow = async (active: string) => {
  const hook = await renderHook(({ key }: { key: string }) => useChipRowScroll(key, MARGIN), {
    initialProps: { key: active },
  });
  await letTheDeviceAnswer();
  const scrollTo = jest.fn();
  const { current } = hook.result;
  current.ref.current = { scrollTo } as unknown as ScrollViewInstance;
  await act(() => {
    current.onLayout(laidOut(0, 300));
    current.onChipLayout("a")(laidOut(20, 60));
    current.onChipLayout("b")(laidOut(90, 60));
    current.onChipLayout("c")(laidOut(380, 60));
  });
  return { ...hook, scrollTo };
};

describe("useChipRowScroll", () => {
  it("leaves the row where it is while the active chip is on screen", async () => {
    deviceIsFineWithMotion();
    const { rerender, scrollTo } = await measuredRow("a");

    await rerender({ key: "b" });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls the row for an active chip past its edge to come into view", async () => {
    deviceIsFineWithMotion();
    const { rerender, scrollTo } = await measuredRow("a");

    await rerender({ key: "c" });
    expect(scrollTo).toHaveBeenCalledWith({ x: 160, animated: true });
  });

  it("follows the row's own scroll before deciding", async () => {
    deviceIsFineWithMotion();
    const { result, rerender, scrollTo } = await measuredRow("c");
    await act(() => result.current.onScroll({ nativeEvent: { contentOffset: { x: 160 } } }));

    await rerender({ key: "a" });
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, animated: true });
  });

  it("jumps rather than glides for a player who asked for less motion", async () => {
    deviceAsksForLessMotion();
    const { rerender, scrollTo } = await measuredRow("a");

    await rerender({ key: "c" });
    expect(scrollTo).toHaveBeenCalledWith({ x: 160, animated: false });
  });
});
