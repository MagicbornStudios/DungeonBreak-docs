/* biome-ignore-all lint/suspicious/noBitwiseOperators: xorshift32 requires bitwise operations for deterministic RNG. */
export class DeterministicRng {
  private state: number;

  constructor(seed = 7) {
    const normalized = Number.isFinite(seed) ? Math.floor(seed) : 7;
    this.state = (normalized >>> 0) || 7;
  }

  nextFloat(): number {
    // xorshift32 for deterministic cross-platform behavior.
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x1_0000_0000;
  }

  nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      return 0;
    }
    return Math.floor(this.nextFloat() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Cannot pick from empty list");
    }
    return items[this.nextInt(items.length)] as T;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(i + 1);
      const temp = next[i] as T;
      next[i] = next[j] as T;
      next[j] = temp;
    }
    return next;
  }

  getState(): number {
    return this.state >>> 0;
  }

  setState(nextState: number): void {
    const normalized = Math.floor(nextState) >>> 0;
    this.state = normalized || 7;
  }
}
