/****************************************************************************
**
** Copyright (C) 2018 The Qt Company Ltd.
** Contact: https://www.qt.io/licensing/
**
** Some code of this file is part of the plugins of the Qt Toolkit.
**
** $QT_BEGIN_LICENSE:GPL$
** Commercial License Usage
** Licensees holding valid commercial Qt licenses may use this file in
** accordance with the commercial license agreement provided with the
** Software or, alternatively, in accordance with the terms contained in
** a written agreement between you and The Qt Company. For licensing terms
** and conditions see https://www.qt.io/terms-conditions. For further
** information use the contact form at https://www.qt.io/contact-us.
**
** GNU General Public License Usage
** Alternatively, this file may be used under the terms of the GNU
** General Public License version 3 or (at your option) any later version
** approved by the KDE Free Qt Foundation. The licenses are as published by
** the Free Software Foundation and appearing in the file LICENSE.GPL3
** included in the packaging of this file. Please review the following
** information to ensure the GNU General Public License requirements will
** be met: https://www.gnu.org/licenses/gpl-3.0.html.
**
** $QT_END_LICENSE$
**
****************************************************************************/

/*
 * Copyright (c) 2019-2020 Amine Anane. http: //digitalkhatt/license
 * This file is part of DigitalKhatt.
 *
 * Some code in this file was inspired from the file qtloader.js of the WebAssembly plugin of the Qt Toolkit 
 * However it has been completely changed.
 * 
 * DigitalKhatt is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * DigitalKhatt is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with DigitalKhatt. If not, see
 * <https: //www.gnu.org/licenses />.
*/


import VisualMetafontModule from "./VisualMetaFontWasm.js";

class QuranService {
  module;
  quranShaper;

  promise;


  error;
  files;

  CSS_UNITS = 96.0 / 72.0;

  constructor() {

    this.files = {};

    this.promise = this.instantiateWasm("VisualMetaFontWasm.wasm");

  }


  fetchAllfiles() {
    return Promise.all([
      fetch("assets/mfplain.mp").then((response) => response.arrayBuffer()),
      fetch("assets/mpguifont.mp").then((response) => response.arrayBuffer())
    ]).then(([mfplain, mpguifont]) => {
      return {
        mfplain: new Int8Array(mfplain),
        mpguifont: new Int8Array(mpguifont)
      }
    }).catch((err) => {
      console.log(err);
    });

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

  getOutputScale(ctx) {
    let devicePixelRatio = window.devicePixelRatio || 1;
    let backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1;
    let pixelRatio = devicePixelRatio / backingStoreRatio;
    return {
      sx: pixelRatio,
      sy: pixelRatio,
      scaled: pixelRatio !== 1,
    };
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
