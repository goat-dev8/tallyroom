// Exact rational arithmetic on BigInt. Always normalized (gcd-reduced, positive denominator).
const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
export class Fraction {
  readonly n: bigint; readonly d: bigint;
  constructor(n: bigint | number, d: bigint | number = 1n) {
    let N = BigInt(n), D = BigInt(d);
    if (D === 0n) throw new RangeError('zero denominator');
    if (D < 0n) { N = -N; D = -D; }
    const g = gcd(N, D) || 1n; this.n = N / g; this.d = D / g;
  }
  static of(x: number | bigint) { return new Fraction(x); }
  static ZERO = new Fraction(0n);
  add(o: Fraction) { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o: Fraction) { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o: Fraction) { return new Fraction(this.n * o.n, this.d * o.d); }
  div(o: Fraction) { return new Fraction(this.n * o.d, this.d * o.n); }
  cmp(o: Fraction) { const l = this.n * o.d, r = o.n * this.d; return l < r ? -1 : l > r ? 1 : 0; }
  isZero() { return this.n === 0n; }
  /** Fixed-point string, truncated toward zero is NOT used: rounds half-up on the absolute value. */
  toFixed(dp: number) {
    const s = 10n ** BigInt(dp); const neg = this.n < 0n; const a = neg ? -this.n : this.n;
    const q = (a * s * 2n + this.d) / (this.d * 2n);
    const whole = q / s, frac = (q % s).toString().padStart(dp, '0');
    return (neg && q !== 0n ? '-' : '') + whole.toString() + (dp ? '.' + frac : '');
  }
  toNumber() { return Number(this.n) / Number(this.d); }
}
