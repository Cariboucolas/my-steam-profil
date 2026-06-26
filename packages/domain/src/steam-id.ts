import { type Result, ok, err } from "./result";

export type SteamIdError = "EMPTY" | "INVALID_FORMAT";

export class SteamId {
  private constructor(public readonly value: string) {}

  static create(input: string): Result<SteamId, SteamIdError> {
    const trimmed = input.trim();
    if (trimmed.length === 0) return err("EMPTY");
    if (!/^\d{17}$/.test(trimmed)) return err("INVALID_FORMAT");
    return ok(new SteamId(trimmed));
  }

  equals(other: SteamId): boolean {
    return this.value === other.value;
  }
}
