
import VisualMetafontModule from "./VisualMetaFontWasm.js";

class QuranService {
  module;
  quranShaper;
  promise;
  error;

  constructor() {
    this.promise = this.instantiateWasm("VisualMetaFontWasm.wasm");
  }

  async instantiateWasm(url) {

    let compPromise;
    if (typeof WebAssembly.compileStreaming !== "undefined") {
      this.setStatus(null, "Fetching/Compiling");
      compPromise = WebAssembly.compileStreaming(fetch(url));
    } else {
      this.setStatus(null, "Fetching");
      const response = await fetch(url);

      if (response.ok) {
        compPromise = response.arrayBuffer().then((buffer) => {
          this.setStatus(null, "Compiling")
          return WebAssembly.compile(buffer);
        });
      } else {
        const error = new Error(response.statusText)
        this.setStatus(error, "Error during fetching WebAssembly.");
        return Promise.reject(error)
      }
    }

    return compPromise.then((module) => {
      return this.initilizeModule(module);
    });
  }

  initilizeModule(wasmModule) {
    this.module = {
      instantiateWasm: (imports, successCallback) => {
        WebAssembly.instantiate(wasmModule, imports).then((instance) => {
          successCallback(instance, wasmModule);
        }, (error) => {
          this.error = error;
          this.setStatus(error, "Error during instantiation");
          console.log("Error during instantiation ", error);
        });
        return {};
      },
      onRuntimeInitialized: () => {

        const result = new this.module.QuranShaper(); //new QuranShaper(this.module.QuranShaper());

        if (result) {
          this.quranShaper = result; // new QuranShaper(result, this.module);

          this.module.FS.unlink("ayah.mp");
          this.module.FS.unlink("mfplain.mp");
          this.module.FS.unlink("mpguifont.mp");
          this.module.FS.unlink("myfontbase.mp");
          this.module.FS.unlink("digitalkhatt.mp");
          this.module.FS.unlink("parameters.json");
          this.module.FS.unlink("automedina.fea");

        } else {
          throw (Error("Cannot initialize Visual metafont library"));
        }
      },
      preRun: [
        () => {

          this.module.FS.createPreloadedFile(".", "mfplain.mp", "mfplain.mp", true, false);
          this.module.FS.createPreloadedFile(".", "ayah.mp", "ayah.mp", true, false);
          this.module.FS.createPreloadedFile(".", "mpguifont.mp", "mpguifont.mp", true, false);
          this.module.FS.createPreloadedFile(".", "myfontbase.mp", "myfontbase.mp", true, false);
          this.module.FS.createPreloadedFile(".", "digitalkhatt.mp", "digitalkhatt.mp", true, false);
          this.module.FS.createPreloadedFile(".", "parameters.json", "parameters.json", true, false);
          this.module.FS.createPreloadedFile(".", "automedina.fea", "automedina.fea", true, false);
        }],
      postRun: [],
      noInitialRun: true,
      wasmMemory: new WebAssembly.Memory({ initial: 310, maximum: 6400 })
    };

    const promise = VisualMetafontModule(this.module).then(() => {
      console.log("Webassembly compiled and instantiated");
      return this.quranShaper;
    }).catch((error) => {
      this.setStatus(error, "Error during WebAssembly instantiation.");
      throw error;
    })

    return promise;
  }

  clearCanvas(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Will always clear the right space
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  setStatus(error, message) {
    console.log(message);
  }
}

let quranService = new QuranService()

quranService.promise
  .then(result => {
    //console.log(result);
  })
  .catch(error => {
    console.error(error);
  })

export default quranService;
