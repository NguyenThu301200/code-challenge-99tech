import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from './sum_to_n.js';

type Impl = (n: number) => number;
const impls: Record<string, Impl> = { a: sum_to_n_a, b: sum_to_n_b, c: sum_to_n_c };

const cases: Array<[number, number]> = [
  [0, 0], // empty sum
  [1, 1],
  [5, 15], // brief's example
  [10, 55],
  [100, 5050],
  [1000, 500500],
  [-5, -15], // signed-sum convention
  [-1, -1],
];

let failures = 0;
for (const [name, fn] of Object.entries(impls)) {
  for (const [n, expected] of cases) {
    const got = fn(n);
    const ok = got === expected;
    if (!ok) failures++;
    console.log(`${ok ? '✓' : '✗'} sum_to_n_${name}(${n}) = ${got} (expected ${expected})`);
  }
}

// Input validation
for (const bad of [1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2]) {
  for (const [name, fn] of Object.entries(impls)) {
    try {
      fn(bad);
      console.log(`✗ sum_to_n_${name}(${bad}) should have thrown`);
      failures++;
    } catch (err) {
      if (err instanceof RangeError) {
        console.log(`✓ sum_to_n_${name}(${bad}) throws RangeError`);
      } else {
        console.log(`✗ sum_to_n_${name}(${bad}) threw wrong error: ${err}`);
        failures++;
      }
    }
  }
}

// Cross-check: all three agree on 100 random inputs
for (let i = 0; i < 100; i++) {
  const n = Math.floor(Math.random() * 20001) - 10000; // [-10000, 10000]
  const [a, b, c] = [sum_to_n_a(n), sum_to_n_b(n), sum_to_n_c(n)];
  if (a !== b || b !== c) {
    console.log(`✗ disagreement at n=${n}: a=${a} b=${b} c=${c}`);
    failures++;
  }
}
console.log(`\n${failures === 0 ? '✓ all tests passed' : `✗ ${failures} failure(s)`}`);
process.exit(failures === 0 ? 0 : 1);
