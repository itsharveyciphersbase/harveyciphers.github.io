/**
 * Assembles assets/wasm/demo.wasm by hand.
 *
 * The point of the demo is that a .wasm file is an ordinary static asset:
 * GitHub Pages serves the bytes, the browser compiles them. Normally you would
 * produce this with Rust, Go, or wat2wasm and commit the output; this script
 * emits the binary directly so the repository needs no toolchain.
 *
 * Exports:
 *   add(i32, i32) -> i32     the obligatory smoke test
 *   fib(i32)      -> i32     an iterative loop, so there is real work to time
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const MAGIC = [0x00, 0x61, 0x73, 0x6d];
const VERSION = [0x01, 0x00, 0x00, 0x00];
const I32 = 0x7f;

/** Little-endian base-128, the integer encoding used throughout the format. */
function uleb128(value) {
  const bytes = [];
  let remaining = value;
  do {
    let byte = remaining & 0x7f;
    remaining >>>= 7;
    if (remaining !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (remaining !== 0);
  return bytes;
}

const vector = (items) => [...uleb128(items.length), ...items.flat()];
const section = (id, payload) => [id, ...uleb128(payload.length), ...payload];
const name = (text) => [...uleb128(text.length), ...Buffer.from(text, 'utf8')];

// --- Section 1: types --------------------------------------------------------
const typeSection = section(
  1,
  vector([
    [0x60, ...vector([[I32], [I32]]), ...vector([[I32]])], // (i32, i32) -> i32
    [0x60, ...vector([[I32]]), ...vector([[I32]])], //        (i32) -> i32
  ])
);

// --- Section 3: function declarations ---------------------------------------
const functionSection = section(3, vector([[0], [1]]));

// --- Section 7: exports ------------------------------------------------------
const exportSection = section(
  7,
  vector([
    [...name('add'), 0x00, 0],
    [...name('fib'), 0x00, 1],
  ])
);

// --- Section 10: code --------------------------------------------------------
// add: local.get 0; local.get 1; i32.add
const addBody = [
  ...vector([]), // no extra locals
  0x20, 0x00,
  0x20, 0x01,
  0x6a,
  0x0b,
];

// fib: a = 0; b = 1; while (n--) { [a, b] = [b, a + b] } return a
const fibBody = [
  ...vector([[0x03, I32]]), // three i32 locals: a=1, b=2, tmp=3
  0x41, 0x00, 0x21, 0x01, //          a = 0
  0x41, 0x01, 0x21, 0x02, //          b = 1
  0x02, 0x40, //                      block $exit
  0x03, 0x40, //                        loop $again
  0x20, 0x00, 0x45, //                    n == 0 ?
  0x0d, 0x01, //                          br_if $exit
  0x20, 0x01, 0x20, 0x02, 0x6a, 0x21, 0x03, // tmp = a + b
  0x20, 0x02, 0x21, 0x01, //              a = b
  0x20, 0x03, 0x21, 0x02, //              b = tmp
  0x20, 0x00, 0x41, 0x01, 0x6b, 0x21, 0x00, // n = n - 1
  0x0c, 0x00, //                          br $again
  0x0b, //                              end loop
  0x0b, //                            end block
  0x20, 0x01, //                      return a
  0x0b,
];

const codeSection = section(
  10,
  vector([
    [...uleb128(addBody.length), ...addBody],
    [...uleb128(fibBody.length), ...fibBody],
  ])
);

const bytes = Uint8Array.from([
  ...MAGIC,
  ...VERSION,
  ...typeSection,
  ...functionSection,
  ...exportSection,
  ...codeSection,
]);

if (!WebAssembly.validate(bytes)) {
  throw new Error('generated module failed WebAssembly.validate()');
}

const { instance } = await WebAssembly.instantiate(bytes);
const { add, fib } = instance.exports;

const checks = [
  ['add(2, 3)', add(2, 3), 5],
  ['add(-8, 8)', add(-8, 8), 0],
  ['fib(0)', fib(0), 0],
  ['fib(1)', fib(1), 1],
  ['fib(10)', fib(10), 55],
  ['fib(30)', fib(30), 832040],
];

for (const [label, actual, expected] of checks) {
  if (actual !== expected) throw new Error(`${label} returned ${actual}, expected ${expected}`);
  console.log(`  ok  ${label} = ${actual}`);
}

mkdirSync('assets/wasm', { recursive: true });
writeFileSync('assets/wasm/demo.wasm', bytes);
console.log(`\nassets/wasm/demo.wasm — ${bytes.length} bytes`);
