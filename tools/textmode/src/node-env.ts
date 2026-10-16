// Runs the app's browser-oriented HarfBuzz loader under Node: fetch() of a
// local path reads the file, then we wait for loadHarfbuzz() to install `hb`.
import { readFileSync } from "node:fs";
import * as App from "./app";

const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
  const s = String(url);
  if (!/^https?:/.test(s)) return new Response(readFileSync(s));
  return realFetch(url, init);
}) as typeof fetch;

export async function initHarfBuzz(wasmPath: string): Promise<void> {
  const log = console.log;
  console.log = () => {};                      // loadHarfbuzz() logs the whole wasm module
  try {
    await App.loadHarfbuzz(wasmPath);
    for (let i = 0; i < 1000 && !App.hb; i++) await new Promise(r => setTimeout(r, 10));
  } finally {
    console.log = log;
  }
  if (!App.hb) throw new Error("HarfBuzz did not initialise");
}

export async function loadFont(name: string, path: string): Promise<App.HarfBuzzFont> {
  await App.loadAndCacheFont(name, path);
  return App.harfbuzzFonts.get(name)!;
}
