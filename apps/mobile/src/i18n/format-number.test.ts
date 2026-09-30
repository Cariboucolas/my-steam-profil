import { formatNumber } from "./format-number";
import { translatorFor } from "./i18n";

const en = translatorFor("en");
const fr = translatorFor("fr");

describe("formatNumber", () => {
  it("groups thousands with a plain space in both locales", () => {
    expect(formatNumber(en, 3128)).toBe("3 128");
    expect(formatNumber(fr, 3128)).toBe("3 128");
    expect(formatNumber(en, 1234567)).toBe("1 234 567");
    expect(formatNumber(fr, 1234567)).toBe("1 234 567");
  });

  it("leaves a figure under a thousand alone", () => {
    expect(formatNumber(en, 999)).toBe("999");
    expect(formatNumber(en, 0)).toBe("0");
  });

  it("takes the decimal mark from the locale it was given", () => {
    expect(formatNumber(en, 45.5, 1)).toBe("45.5");
    expect(formatNumber(fr, 45.5, 1)).toBe("45,5");
  });

  it("groups the integer part of a figure that has a decimal", () => {
    expect(formatNumber(en, 1234.5, 1)).toBe("1 234.5");
    expect(formatNumber(fr, 1234.5, 1)).toBe("1 234,5");
  });

  it("drops a trailing zero rather than writing it", () => {
    expect(formatNumber(en, 10, 1)).toBe("10");
  });

  it("uses U+0020 for grouping, whatever the locale's own separator is", () => {
    expect(formatNumber(fr, 45500)).not.toMatch(/[   ]/);
  });
});
