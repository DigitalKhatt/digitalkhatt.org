// Bundles the Node entry points. The app's own TypeScript (just.service.ts,
// harfbuzz.ts, qurantext.service.ts) is compiled in as-is; only @angular/core
// is replaced by a tiny stub, since nothing here needs Angular at runtime.
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

await build({
  entryPoints: Object.fromEntries(
    ["collect", "verify", "browser-check", "inkcheck", "check-breaks"]
      .filter(name => existsSync(`src/${name}.ts`))
      .map(name => [name, `src/${name}.ts`])),
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  alias: { "@angular/core": here + "src/angular-core-stub.ts" },
  // the app's sources live outside this folder: resolve their npm imports
  // (harfbuzzjs, lz-string) from this folder's node_modules
  nodePaths: [here + "node_modules"],
  external: ["playwright"],
  // hb.js (Emscripten) uses require/__dirname in its Node branch
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; import { fileURLToPath as __fu } from 'node:url';" +
      "const require = __cr(import.meta.url); const __filename = __fu(import.meta.url);" +
      "const __dirname = __fu(new URL('.', import.meta.url));",
  },
  logLevel: "warning",
});
