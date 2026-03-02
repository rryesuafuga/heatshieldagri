/**
 * wasm-runtime.ts
 * ================
 * Wrapper around the real Rust-compiled WebAssembly module.
 * Handles lazy initialization and re-exports all WASM functions.
 *
 * Usage:
 *   import { initWasm, wasmReady, wasm } from './wasm-runtime';
 *   await initWasm();                    // call once at app start
 *   const result = wasm.calculate_wbgt(32, 65, 2, 700);
 */

import init, * as wasmBindings from 'heatshield-wasm';

let _initialized = false;
let _initPromise: Promise<void> | null = null;

/** Initialize the WASM module. Safe to call multiple times. */
export async function initWasm(): Promise<void> {
  if (_initialized) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    // init() resolves the .wasm path via import.meta.url automatically
    await init();
    _initialized = true;
  })();
  return _initPromise;
}

/** True once WASM is loaded and functions are callable. */
export function wasmReady(): boolean {
  return _initialized;
}

/** Direct access to all WASM bindings (only call after initWasm resolves). */
export const wasm = wasmBindings;
