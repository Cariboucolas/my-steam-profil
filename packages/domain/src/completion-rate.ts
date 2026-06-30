export class CompletionRate {
  private constructor(public readonly percentage: number) {}

  static from(unlocked: number, total: number): CompletionRate {
    if (!Number.isInteger(unlocked) || !Number.isInteger(total)) {
      throw new RangeError("unlocked and total must be integers");
    }
    if (unlocked < 0 || total < 0) {
      throw new RangeError("unlocked and total must be non-negative");
    }
    if (unlocked > total) {
      throw new RangeError("unlocked cannot exceed total");
    }
    const percentage = total === 0 ? 0 : (unlocked / total) * 100;
    return new CompletionRate(percentage);
  }

  get rounded(): number {
    return Math.round(this.percentage * 10) / 10;
  }

  format(): string {
    return `${this.rounded} %`;
  }
}
