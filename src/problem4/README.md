# Problem 4 — Three ways to sum to n

Three distinct TypeScript implementations of `sum_to_n`, each with a clear
complexity trade-off.

```
sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15
```

## Shared contract

All three functions agree on every input, so they are drop-in interchangeable:

- `n` must be a **safe integer** (`Number.isSafeInteger`); otherwise `RangeError`.
- `n = 0` → `0` (empty sum, by convention).
- `n > 0` → `1 + 2 + … + n`.
- `n < 0` → `n + (n+1) + … + (-1)` — the signed-sum extension.
  This is what the closed-form identity `sign(n) · |n|·(|n|+1) / 2`
  gives naturally, and it keeps every implementation total.

The input validation is important: the brief guarantees the **result** fits in
`Number.MAX_SAFE_INTEGER`, but not the input. Without the guard,
`sum_to_n_a(1.5)` silently returns `1.875`, and `sum_to_n_b(1.5)` loops
forever (the condition `i <= 1.5` holds for `i = 1` only, but the mirror
branch below never terminates on NaN).

## Implementations

| # | Approach             | Time | Space | Best for |
|---|----------------------|------|-------|----------|
| A | Closed-form formula  | O(1) | O(1)  | Always — this is the right answer. |
| B | Iterative loop       | O(n) | O(1)  | Teaching / showing the basic shape. |
| C | Functional reduce    | O(n) | O(n)  | Readability demo — avoid in production. |

See [`src/sum_to_n.ts`](src/sum_to_n.ts) for the implementations with inline
complexity notes.

### Why no recursion

A recursive version is the obvious fourth candidate, but JavaScript does not
guarantee tail-call optimization in any mainstream engine (V8, SpiderMonkey,
JavaScriptCore). Even a tail-recursive `sum_to_n` blows the stack around
`n ≈ 10 000`, long before the result overflows `Number.MAX_SAFE_INTEGER`
(~`6.7 × 10⁷` as the largest safe `n`). Keeping version B iterative avoids
that cliff.

### Why `Math.abs` + `Math.sign` in (A)

`n * (n + 1) / 2` with `n = -3` returns `3`, not `-6` — the formula is
symmetric around `-0.5`. Factoring `sign(n) · |n|·(|n|+1) / 2` restores the
signed-sum meaning and is still one multiplication and one shift.

## Run the tests

```bash
npm install
npm test            # runs src/test.ts — 36 checks + 100 random cross-checks
npm run typecheck   # tsc --noEmit, strict mode
```

Expected output ends with `✓ all tests passed`.

## File layout

```
problem4-sum-to-n/
├── package.json
├── tsconfig.json       # strict + noUncheckedIndexedAccess
├── README.md
└── src/
    ├── sum_to_n.ts     # three implementations + shared guard
    └── test.ts         # unit + validation + random cross-check
```

## Improvements worth considering

- **BigInt variant** — if the caller later removes the safe-integer cap,
  a `sum_to_n_big(n: bigint): bigint` using the same formula is a drop-in
  replacement with no overflow at all.
- **Tagged type** for the input (e.g. `SafeInteger = number & { __brand }`)
  so callers that already validated don't re-pay for the guard.
- **Benchmark harness** (`tinybench`) — handy if someone ever doubts that
  (A) is in fact the right default; on n = 10⁷ the gap is ~10⁴× in wall time.
