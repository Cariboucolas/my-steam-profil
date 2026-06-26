import { describe, it, expect } from "vitest";
import { ok, err, type Result } from "./result";

describe("Result", () => {
  it("crée un succès via ok()", () => {
    const r: Result<number, string> = ok(42);
    expect(r).toEqual({ ok: true, value: 42 });
  });

  it("crée une erreur via err()", () => {
    const r: Result<number, string> = err("BOOM");
    expect(r).toEqual({ ok: false, error: "BOOM" });
  });
});
