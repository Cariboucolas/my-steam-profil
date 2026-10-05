import { render, screen } from "@testing-library/react-native";

import { ChartLegendKey } from "./ChartLegendKey";

describe("ChartLegendKey", () => {
  it("writes its label beside the swatch", () => {
    render(<ChartLegendKey label="per year" swatch="bar" />);
    expect(screen.getByText("per year")).toBeTruthy();
  });
});
