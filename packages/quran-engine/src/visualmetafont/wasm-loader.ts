/**
 * @digitalkhatt/quran-engine - VisualMetaFont WASM Loader
 *
 * Handles loading and initialization of the VisualMetaFont WebAssembly module
 */

import type { VisualMetaFontAssets } from '../core/types';
import type {
  EmscriptenModule,
  VMFQuranShaperNative,
  VisualMetaFontModuleFactory,
} from './types';

/**
 * Status callback for loading progress
 */
export type StatusCallback = (error: Error | null, message: string) => void;

/**
 * Result of loading the VisualMetaFont WASM module
 */
export interface VMFLoadResult {
  quranShaper: VMFQuranShaperNative;
  module: EmscriptenModule;
}

/**
 * Loads and initializes the VisualMetaFont WASM module
 *
 * @param wasmUrl - URL to the VisualMetaFontWasm.wasm file
 * @param assets - URLs to the required asset files
 * @param moduleFactory - The Emscripten module factory (from VisualMetaFontWasm.js)
 * @param onStatus - Optional callback for loading status updates
 * @returns Promise resolving to the initialized QuranShaper and module
 */
export async function loadVisualMetaFontWasm(
  wasmUrl: string,
  assets: VisualMetaFontAssets,
  moduleFactory: VisualMetaFontModuleFactory,
  onStatus?: StatusCallback
): Promise<VMFLoadResult> {
  const setStatus = onStatus ?? (() => {});

  // Compile the WASM module
  let wasmModule: WebAssembly.Module;

  try {
    if (typeof WebAssembly.compileStreaming !== 'undefined') {
      setStatus(null, 'Fetching/Compiling');
      wasmModule = await WebAssembly.compileStreaming(fetch(wasmUrl));
    } else {
      setStatus(null, 'Fetching');
      const response = await fetch(wasmUrl);

      if (!response.ok) {
        const error = new Error(response.statusText);
        setStatus(error, 'Error during fetching WebAssembly');
        throw error;
      }

      const buffer = await response.arrayBuffer();
      setStatus(null, 'Compiling');
      wasmModule = await WebAssembly.compile(buffer);
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    setStatus(error, 'Error during WebAssembly compilation');
    throw error;
  }

  // Initialize the module
  return initializeModule(wasmModule, assets, moduleFactory, setStatus);
}

/**
 * Initializes the Emscripten module with the compiled WASM
 */
async function initializeModule(
  wasmModule: WebAssembly.Module,
  assets: VisualMetaFontAssets,
  moduleFactory: VisualMetaFontModuleFactory,
  setStatus: StatusCallback
): Promise<VMFLoadResult> {
  return new Promise((resolve, reject) => {
    let quranShaper: VMFQuranShaperNative | null = null;
    let emModule: EmscriptenModule | null = null;

    const moduleConfig: Partial<EmscriptenModule> = {
      instantiateWasm: (imports, successCallback) => {
        WebAssembly.instantiate(wasmModule, imports)
          .then((instance) => {
            successCallback(instance, wasmModule);
          })
          .catch((error) => {
            setStatus(error, 'Error during instantiation');
            reject(error);
          });
        return {};
      },

      onRuntimeInitialized: () => {
        try {
          if (!emModule) {
            throw new Error('Module not initialized');
          }

          const result = new emModule.QuranShaper();

          if (!result) {
            throw new Error('Cannot initialize VisualMetaFont library');
          }

          quranShaper = result;

          // Unlink asset files to free memory
          const FS = emModule.FS;
          FS.unlink('ayah.mp');
          FS.unlink('mfplain.mp');
          FS.unlink('mpguifont.mp');
          FS.unlink('myfontbase.mp');
          FS.unlink('digitalkhatt.mp');
          FS.unlink('parameters.json');
          FS.unlink('automedina.fea');

          // Call getOutline to load page data, then unlink
          quranShaper.getSuraLocations(false).delete();
          quranShaper.getSuraLocations(true).delete();

          FS.unlink('texpages.dat');
          FS.unlink('medinapages.dat');

          resolve({ quranShaper, module: emModule });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setStatus(error, 'Error during runtime initialization');
          reject(error);
        }
      },

      preRun: [
        function (this: EmscriptenModule) {
          // Use arrow function to capture emModule after it's set
          const mod = emModule;
          if (!mod) return;

          const FS = mod.FS;
          FS.createPreloadedFile('.', 'mfplain.mp', assets.mfplain, true, false);
          FS.createPreloadedFile('.', 'ayah.mp', assets.ayah, true, false);
          FS.createPreloadedFile('.', 'mpguifont.mp', assets.mpguifont, true, false);
          FS.createPreloadedFile('.', 'myfontbase.mp', assets.myfontbase, true, false);
          FS.createPreloadedFile('.', 'digitalkhatt.mp', assets.digitalkhatt, true, false);
          FS.createPreloadedFile('.', 'parameters.json', assets.parameters, true, false);
          FS.createPreloadedFile('.', 'automedina.fea', assets.automedina, true, false);
          FS.createPreloadedFile('.', 'texpages.dat', assets.texpages, true, false);
          FS.createPreloadedFile('.', 'medinapages.dat', assets.medinapages, true, false);
        },
      ],

      postRun: [],
      noInitialRun: true,
      wasmMemory: new WebAssembly.Memory({ initial: 310, maximum: 6400 }),
    };

    moduleFactory(moduleConfig)
      .then((mod) => {
        emModule = mod as EmscriptenModule;
      })
      .catch((error) => {
        setStatus(error, 'Error during WebAssembly instantiation');
        reject(error);
      });
  });
}

/**
 * Creates a cancellation token for render tasks
 */
export function createRenderToken(): {
  token: { isCancelled: () => boolean; cancel: () => void; onContinue?: (cb: () => void) => void };
  cancel: () => void;
} {
  let cancelled = false;

  const token = {
    isCancelled: () => cancelled,
    cancel: () => {
      cancelled = true;
    },
    onContinue: undefined as ((cb: () => void) => void) | undefined,
  };

  return {
    token,
    cancel: () => {
      cancelled = true;
    },
  };
}
