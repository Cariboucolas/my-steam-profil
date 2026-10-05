import { render, screen } from "@testing-library/react-native";

import { deviceAsksForLessMotion } from "../../accessibility/reduce-motion.test-support";
import { RECORD_FIGURE_SKELETON_TEST_ID, RecordFigure } from "./RecordFigure";

describe("RecordFigure", () => {
  beforeEach(deviceAsksForLessMotion);

  it("is one screen-reader stop saying the figure, what it is and when", () => {
    render(<RecordFigure record={{ value: "312", label: "best month", when: "Jun 2025" }} />);
    expect(screen.getByLabelText("best month, Jun 2025: 312")).toBeTruthy();
  });

  it("stands as a skeleton while the record is not known", () => {
    render(<RecordFigure record={null} />);
    expect(screen.getByTestId(RECORD_FIGURE_SKELETON_TEST_ID)).toBeTruthy();
  });
});
