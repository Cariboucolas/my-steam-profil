export class CompletionRate {
  private constructor(public readonly percentage: number) {}

  static from(unlocked: number, total: number): CompletionRate {
    if (!Number.isInteger(unlocked) || !Number.isInteger(total)) {
      throw new RangeError("unlocked et total doivent être des entiers");
    }
    if (unlocked < 0 || total < 0) {
      throw new RangeError("unlocked et total doivent être positifs");
    }
    if (unlocked > total) {
      throw new RangeError("unlocked ne peut pas dépasser total");
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
