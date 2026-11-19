/** School common-division ladder for LCM / prime factors. */

export type LadderRow = { divisor: number; values: number[] };

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function smallestPrimeFactor(n: number): number {
  if (n < 2) return n;
  if (n % 2 === 0) return 2;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return i;
  }
  return n;
}

/** Divide by a prime whenever it divides any number (NCERT LCM division method). */
export function buildLcmLadder(nums: number[]): {
  rows: LadderRow[];
  remainder: number[];
  lcm: number;
  hcf: number;
} {
  const values = nums.map((n) => Math.max(1, Math.round(Math.abs(n))));
  const hcf = values.reduce((a, b) => gcd(a, b));
  const rows: LadderRow[] = [];
  let cur = [...values];
  let lcm = 1;
  // Large textbook numbers (e.g. 8788) need enough rows
  for (let guard = 0; guard < 64 && cur.some((v) => v > 1); guard++) {
    const p = Math.min(...cur.filter((v) => v > 1).map(smallestPrimeFactor));
    rows.push({ divisor: p, values: [...cur] });
    lcm *= p;
    cur = cur.map((v) => (v % p === 0 ? v / p : v));
  }
  return { rows, remainder: cur, lcm, hcf };
}

/** Count prime exponents from a single-number division ladder. */
export function primeExponents(n: number): Record<number, number> {
  const { rows } = buildLcmLadder([n]);
  const exp: Record<number, number> = {};
  for (const r of rows) exp[r.divisor] = (exp[r.divisor] ?? 0) + 1;
  return exp;
}

/** Smallest multiplier so every exponent is a multiple of `power` (2=square, 3=cube). */
export function missingForPerfectPower(
  n: number,
  power: 2 | 3,
): { multiplier: number; parts: string[]; exponents: Record<number, number> } {
  const exponents = primeExponents(n);
  let multiplier = 1;
  const parts: string[] = [];
  for (const [pStr, e] of Object.entries(exponents)) {
    const p = Number(pStr);
    const need = (power - (e % power)) % power;
    if (need > 0) {
      multiplier *= p ** need;
      parts.push(need === 1 ? String(p) : `${p}^${need}`);
    }
  }
  return { multiplier, parts, exponents };
}

export function _selfCheckLcmLadder(): void {
  const a = buildLcmLadder([12, 18]);
  if (a.lcm !== 36 || a.hcf !== 6 || a.rows.length < 3) {
    throw new Error(`LCM(12,18) expected 36/6 got ${a.lcm}/${a.hcf}`);
  }
  const b = buildLcmLadder([55]);
  if (b.lcm !== 55 || b.rows.map((r) => r.divisor).join("×") !== "5×11") {
    throw new Error(`factor(55) failed: ${JSON.stringify(b)}`);
  }
  const c = missingForPerfectPower(8788, 3);
  if (c.multiplier !== 2) {
    throw new Error(`8788→cube expected ×2 got ${c.multiplier} (${JSON.stringify(c)})`);
  }
}
