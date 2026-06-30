export class Playtime {
  private constructor(public readonly minutes: number) {}

  static fromMinutes(minutes: number): Playtime {
    if (!Number.isFinite(minutes) || minutes < 0) {
      throw new RangeError(`Invalid playtime: ${minutes}`);
    }
    return new Playtime(Math.round(minutes));
  }

  get hours(): number {
    return this.minutes / 60;
  }

  format(): string {
    const h = Math.floor(this.minutes / 60);
    const m = this.minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${String(m).padStart(2, "0")}`;
  }
}
