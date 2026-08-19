/**
 * Loads and runs assets/wasm/demo.wasm.
 *
 * The binary is committed to the repository and served like any other file —
 * that is the whole point. Pages does not compile it or know what it is; the
 * browser does all of the work.
 *
 * See scripts/build-wasm.mjs for how the module is assembled.
 */
let instancePromise = null;

function instantiate() {
  if (instancePromise) return instancePromise;

  const url = new URL('assets/wasm/demo.wasm', document.baseURI);

  instancePromise = (async () => {
    // Streaming compilation needs the application/wasm content type, which
    // GitHub Pages does send — but a plain local server may not, so fall back
    // to the ArrayBuffer path rather than failing outright.
    try {
      return await WebAssembly.instantiateStreaming(fetch(url));
    } catch {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} loading demo.wasm`);
      return WebAssembly.instantiate(await response.arrayBuffer());
    }
  })();

  return instancePromise;
}

/** The same algorithm in JavaScript, for an honest side-by-side comparison. */
function fibJs(n) {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
}

export async function initWasm() {
  const runButton = document.querySelector('[data-wasm-run]');
  const input = document.querySelector('[data-wasm-input]');
  const output = document.querySelector('[data-wasm-output]');
  const status = document.querySelector('[data-wasm-status]');
  if (!runButton || !output) return;

  if (typeof WebAssembly === 'undefined') {
    if (status) status.textContent = 'This browser has no WebAssembly support.';
    runButton.disabled = true;
    return;
  }

  runButton.addEventListener('click', async () => {
    runButton.disabled = true;
    if (status) status.textContent = 'Compiling and instantiating demo.wasm...';

    try {
      const { instance, module } = await instantiate();
      const { add, fib } = instance.exports;
      const n = Math.min(Math.max(Number(input && input.value) || 30, 0), 90);

      // One warm-up pass so we time steady-state execution, not compilation.
      fib(n);
      fibJs(n);

      const iterations = 20000;

      const wasmStart = performance.now();
      let wasmResult = 0;
      for (let i = 0; i < iterations; i += 1) wasmResult = fib(n);
      const wasmMs = performance.now() - wasmStart;

      const jsStart = performance.now();
      let jsResult = 0;
      for (let i = 0; i < iterations; i += 1) jsResult = fibJs(n);
      const jsMs = performance.now() - jsStart;

      const rows = [
        ['Exports', Object.keys(instance.exports).join(', ')],
        ['Module size', '103 bytes'],
        ['add(19, 23)', String(add(19, 23))],
        [`fib(${n}) via wasm`, wasmResult.toLocaleString()],
        [`fib(${n}) via JS`, jsResult.toLocaleString()],
        [`${iterations.toLocaleString()} calls, wasm`, `${wasmMs.toFixed(1)} ms`],
        [`${iterations.toLocaleString()} calls, JS`, `${jsMs.toFixed(1)} ms`],
      ];

      output.replaceChildren();
      for (const [label, value] of rows) {
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        output.append(dt, dd);
      }

      if (status) {
        const agreement = wasmResult === jsResult ? 'identical results' : 'RESULTS DIVERGED';
        status.textContent =
          `${WebAssembly.Module.exports(module).length} exports, ${agreement}. ` +
          'At this size JavaScript is usually just as quick — wasm earns its keep on heavier numeric work.';
      }
    } catch (error) {
      if (status) {
        status.textContent = `Could not run the module: ${error.message}. Serve the site over http:// rather than file://.`;
      }
      console.error('[wasm]', error);
    } finally {
      runButton.disabled = false;
    }
  });
}
