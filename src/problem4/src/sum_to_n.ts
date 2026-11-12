/**
 * Problem 4 — Three ways to sum to n
 *
 * Spec: sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15
 *
 * The brief guarantees the RESULT fits in Number.MAX_SAFE_INTEGER, but it
 * does not guarantee `n` itself is valid input, and it is silent on `n <= 0`.
 * All three implementations below share the same contract:
 *
 *   • `n` must be a safe integer (otherwise → RangeError).
 *   • n === 0            → 0        (empty sum, by convention)
 *   • n  >  0            → 1 + 2 + … + n
 *   • n  <  0            → n + (n+1) + … + (-1)   (mirror / signed sum)
 *
 * The signed-sum extension for negative `n` is a deliberate choice: it keeps
 * the three functions total (always return a number) and matches the
 * closed-form identity sign(n) · |n|·(|n|+1) / 2, so all three agree on
 * every input.
 */

function assertSafeInteger(n: number): void {
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`sum_to_n expects a safe integer; got ${n}`);
  }
}

// ---------------------------------------------------------------------------
// (A) Closed-form arithmetic series — the one every interviewer hopes for.
// ---------------------------------------------------------------------------
// Complexity : O(1) time, O(1) space.
// Notes      : The fastest and most readable solution. Works for negative n
//              by using |n| then re-applying the sign — this matches what
//              the iterative and functional versions compute.
export function sum_to_n_a(n: number): number {
  assertSafeInteger(n);
  const abs = Math.abs(n);
  // |n| and |n|+1 are consecutive integers, so exactly one is even — the
  // division by 2 is always exact, no floating-point rounding.
  return Math.sign(n) * (abs * (abs + 1)) / 2;
}

// ---------------------------------------------------------------------------
// (B) Iterative accumulator — the obvious baseline.
// ---------------------------------------------------------------------------
// Complexity : O(n) time, O(1) space.
// Notes      : Loop direction follows the sign of n, so negatives work the
//              same way. Chosen over recursion because JavaScript has no
//              guaranteed tail-call optimization — a recursive version blows
//              the stack around n ≈ 10_000.
export function sum_to_n_b(n: number): number {
  assertSafeInteger(n);
  let total = 0;
  if (n >= 0) {
    for (let i = 1; i <= n; i++) total += i;
  } else {
    for (let i = -1; i >= n; i--) total += i;
  }
  return total;
}

// ---------------------------------------------------------------------------
// (C) Functional one-liner — reduce over a lazy range.
// ---------------------------------------------------------------------------
// Complexity : O(n) time, O(n) space (the intermediate Array.from).
// Notes      : Cleanest expression of intent, but the worst asymptotics of
//              the three because it materialises an array of length |n|.
//              Included to show the functional style; in production the
//              formula in (A) should always win.
export function sum_to_n_c(n: number): number {
  assertSafeInteger(n);
  const abs = Math.abs(n);
  const sign = Math.sign(n);
  return Array.from({ length: abs }, (_, i) => sign * (i + 1)).reduce(
    (acc, x) => acc + x,
    0,
  );
}
