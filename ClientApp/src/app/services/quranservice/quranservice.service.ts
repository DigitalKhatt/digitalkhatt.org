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

import { Injectable, OnDestroy } from "@angular/core";
import VisualMetafontModule from "./VisualMetaFontWasm.js";

import { QuranShaper } from './quran_shaper';
import { BehaviorSubject } from "rxjs";

//declare var VMASM: any;


@Injectable()
export class QuranService implements OnDestroy {
  private module: any;
  public quranShaper: QuranShaper;

  public promise: Promise<any>;
  private statusSubject = new BehaviorSubject({ error: null, message: "" });
  public statusObserver = this.statusSubject.asObservable();

  error;
  files;

  public static CSS_UNITS: number = 96.0 / 72.0;

  constructor() {

    this.files = {};

    /*
    this.promise = this.fetchAllfiles()
      .then((files) => {
        this.files = files;
      })
      .then(() => this.instantiateWasm2("assets/VisualMetaFontWasm.wasm")
        .then(
          module => module
        ));*/


    /*this.promise = Promise.resolve({ getOutline: (data) => null });

    //alert(navigator.userAgent)

    return;*/

    //var test = VMASM;

    var UA = navigator.userAgent;

    let nbav = window as any;

    var isWebkit = /\b(iPad|iPhone|iPod)\b/.test(UA) && /WebKit/.test(UA) && !/Edge/.test(UA) && !nbav.MSStream;

    //Bug in Apple device : WebAssembly consumes a lot of memory which results in multiple reloads until crash (chrome, Safari, Mozilla due to webkit).
    //Bug not yet reported to Apple : When debuging with top, the browser process memory jumps to 1GB for 2 seconds when executing 'this.module.QuranShaper()' then drops to 200M
    // Short after this, iOS kills the process due to memory watermark limit (Yet, the Wasm memory does not exeed 32MB)
    // When using compiled JS (Wasm -> JS), there is no memory problem, however the performance drops slightly.

    //if (!isWebkit && (typeof WebAssembly !== "undefined")) {
    this.promise = this.instantiateWasm("assets/VisualMetaFontWasm.wasm");
    //} else {
    //  this.promise = this.prepaeASMJS();
    //}
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

  private async instantiateWasm(url: string) {

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

  prepaeASMJS() {
    this.setStatus(null, "Compiling")
    let promise = new Promise((resolve, reject) => {
      this.module = {
        locateFile: (path, prefix) => {
          // if it's a mem init file, use a custom dir
          if (path.endsWith(".mem")) {
            return "vmasm/" + path;
          }
          // otherwise, use the default, the prefix (JS file's dir) + the path
          return prefix + path;
        },

        onRuntimeInitialized: () => {

          let result = new this.module.QuranShaper(); //new QuranShaper(this.module.QuranShaper());

          if (result) {
            this.quranShaper = new QuranShaper(result, this.module);

            this.module.FS.unlink("ayah.mp");
            this.module.FS.unlink("mfplain.mp");
            this.module.FS.unlink("mpguifont.mp");
            this.module.FS.unlink("myfontbase.mp");
            this.module.FS.unlink("digitalkhatt.mp");            
            this.module.FS.unlink("parameters.json");
            this.module.FS.unlink("automedina.fea");

            // use texpages.dat and medinapages.dat to free their memory below
            this.quranShaper.getOutline(false);
            this.quranShaper.getOutline(true);

            this.module.FS.unlink("texpages.dat");
            this.module.FS.unlink("medinapages.dat");


            resolve(this.quranShaper);
          } else {
            reject(Error("Cannot initialize Visual metafont library"));
          }


        },
        preRun: [
          () => {

            //this.initDevices();

            this.module.FS.createPreloadedFile(".", "mfplain.mp", "assets/mfplain.mp", true, false);
            this.module.FS.createPreloadedFile(".", "ayah.mp", "assets/ayah.mp", true, false);
            this.module.FS.createPreloadedFile(".", "mpguifont.mp", "assets/mpguifont.mp", true, false);
            this.module.FS.createPreloadedFile(".", "myfontbase.mp", "assets/myfontbase.mp", true, false);
            this.module.FS.createPreloadedFile(".", "digitalkhatt.mp", "assets/digitalkhatt.mp", true, false);            
            this.module.FS.createPreloadedFile(".", "parameters.json", "assets/parameters.json", true, false);
            this.module.FS.createPreloadedFile(".", "automedina.fea", "assets/automedina.fea", true, false);
            this.module.FS.createPreloadedFile(".", "texpages.dat", "assets/texpages.dat", true, false);
            this.module.FS.createPreloadedFile(".", "medinapages.dat", "assets/medinapages.dat", true, false);
          }],
        postRun: [],
        noInitialRun: true,
      };

      //this.module = VMASM(this.module);
    });

    return promise;

  }



  initilizeModule(wasmModule) : Promise<any> {
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
          this.quranShaper = new QuranShaper(result, this.module);

          this.module.FS.unlink("ayah.mp");
          this.module.FS.unlink("mfplain.mp");
          this.module.FS.unlink("mpguifont.mp");
          this.module.FS.unlink("myfontbase.mp");
          this.module.FS.unlink("digitalkhatt.mp");          
          this.module.FS.unlink("parameters.json");
          this.module.FS.unlink("automedina.fea");

          // use texpages.dat and medinapages.dat to free their memory below
          this.quranShaper.getOutline(false);
          this.quranShaper.getOutline(true);

          this.module.FS.unlink("texpages.dat");
          this.module.FS.unlink("medinapages.dat");

        } else {
          throw (Error("Cannot initialize Visual metafont library"));
        }


      },
      preRun: [
        () => {

          //this.initDevices();

          this.module.FS.createPreloadedFile(".", "mfplain.mp", "assets/mfplain.mp", true, false);
          this.module.FS.createPreloadedFile(".", "ayah.mp", "assets/ayah.mp", true, false);
          this.module.FS.createPreloadedFile(".", "mpguifont.mp", "assets/mpguifont.mp", true, false);
          this.module.FS.createPreloadedFile(".", "myfontbase.mp", "assets/myfontbase.mp", true, false);
          this.module.FS.createPreloadedFile(".", "digitalkhatt.mp", "assets/digitalkhatt.mp", true, false);          
          this.module.FS.createPreloadedFile(".", "parameters.json", "assets/parameters.json", true, false);
          this.module.FS.createPreloadedFile(".", "automedina.fea", "assets/automedina.fea", true, false);
          this.module.FS.createPreloadedFile(".", "texpages.dat", "assets/texpages.dat", true, false);
          this.module.FS.createPreloadedFile(".", "medinapages.dat", "assets/medinapages.dat", true, false);
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

  initDevices() {

    let read = (stream, buffer: Int8Array, offset, length, position, contents) => {

      //var contents = this.files.mfplain;
      if (position >= contents.byteLength) return 0;
      var size = Math.min(contents.byteLength - position, length);

      if (size > 8 && contents.subarray) { // non-trivial, and typed array
        buffer.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
      }
      return size;

    };

    let FS = this.module.FS;

    let deviceId = 64;

    var fDevice = FS.makedev(deviceId++, 0);
    FS.registerDevice(fDevice, {
      open: (stream) => { }, close: (stream) => { },
      read: (stream, buffer, offset, length, position) => read(stream, buffer, offset, length, position, this.files.mfplain),
    });
    FS.mkdev('mfplain.mp', fDevice);

    fDevice = FS.makedev(deviceId++, 0);
    FS.registerDevice(fDevice, {
      open: (stream) => { }, close: (stream) => { },
      read: (stream, buffer, offset, length, position) => read(stream, buffer, offset, length, position, this.files.mpguifont),
    });
    FS.mkdev('mpguifont.mp', fDevice);



  }

  ngOnDestroy() {
    if (this.quranShaper) {
      this.quranShaper.quranShaper.delete();
    }
  }

  setStatus(error, message) {
    this.statusSubject.next({ error: error, message: message });
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



}
