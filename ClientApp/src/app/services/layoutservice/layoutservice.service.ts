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

import { BehaviorSubject } from "rxjs";

import * as cbor from "cbor-web"

class InternalRenderTask {

  lineIndex;
  textContent = [];
  newLines = {};
  ystartposition;
  promiseCapability;
  cancelled;
  lineByIteration = 20;



  constructor(private shaper: LayoutService, private token, private pageIndex, private ctx: CanvasRenderingContext2D, private texFormat) {

    ctx.transform(shaper.matrix[0], 0, 0, shaper.matrix[3], 0, shaper.matrix[5]);

    this.lineIndex = 0;
    this.ystartposition = 0;

    this.promiseCapability = this.createPromiseCapability();

    token.task = this;

    this.cancelled = false;


  }

  getNumberOfLines() {

    if (this.pageIndex === 0 || this.pageIndex === 1) return 8;

    return 15;

  }

  private createPromiseCapability() {
    const capability = Object.create(null);
    let isSettled = false;

    Object.defineProperty(capability, 'settled', {
      get() {
        return isSettled;
      },
    });
    capability.promise = new Promise(function (resolve, reject) {
      capability.resolve = function (data) {
        isSettled = true;
        resolve(data);
      };
      capability.reject = function (reason) {
        isSettled = true;
        reject(reason);
      };
    });
    return capability;
  }

  cancel() {
    this.cancelled = true;
    this.promiseCapability.resolve();
    //console.log("InternalRenderTask cancelled at page " + this.pageIndex);
  }

  render() {
    this._continue();
    return this.promiseCapability.promise;
  }



  iteration() {

    const ctx = this.ctx;
    const shaper = this.shaper;


    const line = shaper.getLine(this.pageIndex, this.lineIndex, this.texFormat);


    if (this.lineIndex === 0) {

      if (this.pageIndex === 0 || this.pageIndex === 1) {
        this.ystartposition = this.shaper.TopSpace + (this.shaper.InterLineSpacing * 1);
      } else {
        this.ystartposition = this.shaper.TopSpace;
      }
    } else {
      if (this.pageIndex === 0 || this.pageIndex === 1) {
        line.type = 0;
        if (this.lineIndex === 1) {
          this.ystartposition += this.shaper.InterLineSpacing * 1.5;
        }
      }
    }

    let currentxPos = shaper.lineWidth + shaper.margin - line.x;
    const currentyPos = this.ystartposition;

    if (this.pageIndex === 0 || this.pageIndex === 1) {
      this.ystartposition += this.shaper.InterLineSpacingFirtPage;
    } else {
      this.ystartposition += this.shaper.InterLineSpacing;
    }


    let lastPos = { x: currentxPos, y: currentyPos };

    ctx.save();

    if (line.type === 1) { //Sura


      const height = shaper.TopSpace;


      const ayaFrameyPos = currentyPos - 3 * height / 5;

      ctx.drawImage(shaper.suraImage, shaper.margin, ayaFrameyPos, shaper.lineWidth, height);

      ctx.transform(0.8, 0, 0, -0.8, lastPos.x - shaper.margin, lastPos.y);



    }
    else if (line.type === 2) { //Bism
      ctx.transform(0.8, 0, 0, -0.8, lastPos.x - (600 << shaper.SCALEBY), lastPos.y - (200 << shaper.SCALEBY));
    }
    else {
      ctx.transform(1, 0, 0, -1, lastPos.x, lastPos.y);

    }

    const glyphs = line.glyphs;

    const glyphNumber = glyphs.length;


    let beginsajda;
    let endsajda;

    for (let glyphIndex = 0; glyphIndex < glyphNumber; glyphIndex++) {

      const glyph = glyphs[glyphIndex];


      if (glyph.color) {
        const color = glyph.color;
        const style = "rgb(" + ((color >> 24) & 0xff) + "," + ((color >> 16) & 0xff) + "," + ((color >> 8) & 0xff) + ")";
        ctx.fillStyle = style;
      }

      const pos = { x: 0, y: 0 };
      currentxPos -= glyph.x_advance || 0;
      pos.x = currentxPos + (glyph.x_offset || 0);
      pos.y = currentyPos - (glyph.y_offset || 0);

      if (glyph.beginsajda) {
        beginsajda = { x: lastPos.x, y: currentyPos };
      }
      else if (glyph.endsajda) {
        endsajda = { x: pos.x, y: currentyPos };
      }

      const diff = {
        x: pos.x - lastPos.x, y: pos.y - lastPos.y
      };
      lastPos = pos;



      ctx.translate(diff.x, -diff.y);

      const cached = shaper.getCached(glyph.codepoint, glyph.lefttatweel || 0, glyph.righttatweel || 0, ctx);
      if (cached) {
        ctx.save();
        const tt = ctx.getTransform();
        ctx.resetTransform();
        ctx.transform(1, 0, 0, 1, tt.e, tt.f);
        ctx.drawImage(cached.canvas, -cached.dx, -cached.dy);
        ctx.restore();
      } else {
        ctx.save();
        ctx.scale(shaper.scalePoint, shaper.scalePoint);
        shaper.displayGlyph(glyph.codepoint, glyph.lefttatweel || 0, glyph.righttatweel || 0, ctx);
        ctx.restore();
      }

      if (glyph.color) {
        ctx.fillStyle = 'rgb(0,0,0)';
      }
    }


    ctx.restore();

    if (beginsajda && endsajda) {

      if (beginsajda.y !== endsajda.y) {
        console.log("Sajda Rule not in the same line");
        beginsajda.x = shaper.lineWidth + shaper.margin - line.xstartposition;
      }


      ctx.beginPath();
      ctx.moveTo(beginsajda.x, endsajda.y - (1150 << shaper.SCALEBY));
      ctx.lineTo(endsajda.x, endsajda.y - (1150 << shaper.SCALEBY));
      ctx.lineWidth = 40 << shaper.SCALEBY;
      ctx.stroke();


      beginsajda = null;
      endsajda = null;
    }
  }

  private _continue() {

    if (this.cancelled) {
      return;
    }

    if (this.token.onContinue) {
      this.token.onContinue(() => this._scheduleNext());
    } else {
      this._scheduleNext();
    }
  }

  private _start() {

    if (this.cancelled) {
      return;
    }

    this._scheduleNext();
  }

  private _scheduleNext() {

    requestAnimationFrame(
      (tt) => {
        this._nextbyTimeAndLines()
      }
    );

  }

  _nextbyTimeAndLines() {

    if (this.cancelled) {
      return;
    }

    if (this.token.pause()) {
      this._continue();
      return;
    }

    const startTime = Date.now()
    const nbLines = this.getNumberOfLines();
    const max = this.lineIndex + 5;
    let elapsed = Date.now() - startTime;
    while (/*elapsed < 15 && */ this.lineIndex < max && this.lineIndex < nbLines) {
      const max = this.lineIndex + 1;
      for (let index = this.lineIndex; index < nbLines && index < max; index++) {
        this.iteration();
        this.lineIndex++;
      }
      elapsed = Date.now() - startTime;
    }

    //console.log(`Page ${this.pageIndex + 1} took ${elapsed} milliseconds with ${this.lineIndex} lines`)

    if (this.lineIndex < nbLines) {
      this._continue()
    } else {
      this.promiseCapability.resolve();
    }

  }


}


@Injectable()
export class LayoutService {

  public SCALEBY = 8;
  public fontScaleRatio;
  public margin = 400 << this.SCALEBY;
  public lineWidth = (17000 - (2 * 400)) << this.SCALEBY;
  //public pagewidth = 17000 << this.SCALEBY;
  public TopSpace = 1450 << this.SCALEBY;
  public InterLineSpacing = 1800 << this.SCALEBY;
  public InterLineSpacingFirtPage = 2025 << this.SCALEBY;
  public suraImage: HTMLImageElement;
  public module: any;
  public scalePoint: number;
  public matrix;
  public scale: number;

  public textContentbyPage;
  public textStyles;
  public textContentbyPagePromise;
  public outline;

  public generateOutline;
  public generateText;

  public promise: Promise<any>;
  private statusSubject = new BehaviorSubject({ error: null, message: "" });
  public statusObserver = this.statusSubject.asObservable();

  public static readonly pageWidth = 255;
  public static readonly pageHeight = 410;

  public static readonly CSS_UNITS: number = 96.0 / 72.0;


  qurandata;


  public cachedImageWidth = 200;

  public glyphsCache = { scale: -1.01, cache: new Map<string, { dx: number, dy: number, canvas: HTMLCanvasElement }>() }

  private currentScale;


  constructor() {

    this.promise = fetch('/assets/quran.json').then(
      response => response.json()
    ).then(result => {
      this.qurandata = result;
      return result;
    })

    /*
    this.promise = fetch('/assets/quran.dat').then(
      response => response.arrayBuffer()
    ).then(result => {
      const data = cbor.decode(result)
      return data
    });*/

    this.suraImage = new Image();

    this.suraImage.src = "assets/ayaframe.svg";

    this.setScalePoint(1);

    this.scale = 72. / (4800 << this.SCALEBY);
    this.matrix = [this.scale, 0, 0, -this.scale, 0, LayoutService.pageHeight];

    this.textContentbyPage = [];
    this.textStyles = {
      "f1": {
        "fontFamily": "sans-serif",
        "ascent": 0.7,
        "descent": 0.2,
        "vertical": false
      }
    }
    this.textContentbyPagePromise = [];
    this.outline = [];

    this.generateOutline = false;
    this.generateText = false;


  }

  setScalePoint(ratio) {
    this.fontScaleRatio = ratio;
    this.scalePoint = (1 << this.SCALEBY) * this.fontScaleRatio;
  }

  getTextContent(pageIndex) {
    return { styles: this.textStyles, items: this.textContentbyPage[pageIndex].items, newLines: this.textContentbyPage[pageIndex].newLines };
  }



  setStatus(error, message) {
    this.statusSubject.next({ error: error, message: message });
  }

  getOutputScale(ctx) {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1;
    const pixelRatio = devicePixelRatio / backingStoreRatio;
    return {
      sx: pixelRatio,
      sy: pixelRatio,
      scaled: pixelRatio !== 1,
    };
  }

  printPage(pageIndex, ctx: CanvasRenderingContext2D, token: any, texFormat) {

    if (token.isCancelled()) {
      return;
    }


    const task = new InternalRenderTask(this, token, pageIndex, ctx, texFormat);

    this.currentScale = ctx.getTransform().a;

    return task.render();

  }

  displayGlyph(codepoint: number, lefttatweel: number, righttatweel: number, ctx: CanvasRenderingContext2D) {
    const glyphInfo = this.qurandata.glyphs[codepoint];
    const limits = glyphInfo.limits || [0, 0, 0, 0];
    if (lefttatweel < limits[0]) {
      lefttatweel = limits[0];
    }
    if (lefttatweel > limits[1]) {
      lefttatweel = limits[1];
    }
    if (righttatweel < limits[2]) {
      righttatweel = limits[2];
    }
    if (righttatweel > limits[3]) {
      righttatweel = limits[3];
    }

    let leftScalar = 0;
    if (lefttatweel < 0) {
      leftScalar = lefttatweel / limits[0];
    } else if (lefttatweel > 0) {
      leftScalar = lefttatweel / limits[1];
    }
    let rightScalar = 0;
    if (righttatweel < 0) {
      rightScalar = righttatweel / limits[2];
    } else if (righttatweel > 0) {
      rightScalar = righttatweel / limits[3];
    }

    function interpolate(value, i, j, k) {
      let interpolatedValue = value;
      if (lefttatweel < 0) {
        interpolatedValue += (glyphInfo.minLeft[i].path[j][k] - value) * leftScalar;
      } else if (lefttatweel > 0) {
        interpolatedValue += (glyphInfo.maxLeft[i].path[j][k] - value) * leftScalar;
      }
      if (righttatweel < 0) {
        interpolatedValue += (glyphInfo.minRight[i].path[j][k] - value) * rightScalar;
      } else if (righttatweel > 0) {
        interpolatedValue += (glyphInfo.maxRight[i].path[j][k] - value) * rightScalar;
      }

      return interpolatedValue;

    }


    ctx.beginPath();
    for (let i = 0; i < glyphInfo.default.length; i++) {
      const defaultPath = glyphInfo.default[i];
      const withColor = defaultPath.color && (defaultPath.color[0] !== 0 || defaultPath.color[1] !== 0 || defaultPath.color[2] !== 0);
      if (withColor && i > 0) {
        ctx.fill();
        ctx.beginPath();
      }
      for (let j = 0; j < defaultPath.path.length; j++) {
        const element = defaultPath.path[j];
        if (element.length === 2) {
          ctx.moveTo(interpolate(element[0], i, j, 0), interpolate(element[1], i, j, 1));
        } else if (element.length === 6) {
          ctx.bezierCurveTo(interpolate(element[0], i, j, 0), interpolate(element[1], i, j, 1), interpolate(element[2], i, j, 2),
            interpolate(element[3], i, j, 3), interpolate(element[4], i, j, 4), interpolate(element[5], i, j, 5));
        }
      }

      if (withColor) {
        const color = defaultPath.color || [0, 0, 0];
        const oldStyle = ctx.fillStyle;
        const style = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
        ctx.fillStyle = style;
        ctx.fill();
        ctx.fillStyle = oldStyle;
        if (i < glyphInfo.default.length - 1) {
          ctx.beginPath();
        }
      }
    }
    ctx.fill();

  }

  getLine(pageIndex, lineIndex, texFormat) {
    let page = this.qurandata.pages[pageIndex];
    let line = page.lines[lineIndex];

    return line;

  }

  getOutline(tex: boolean) {
    const outline = this.qurandata.suras;
    return outline;
  }

  getCached(codepoint, lefttatweel, righttatweel, ctx: CanvasRenderingContext2D) {

    if (lefttatweel !== 0 || righttatweel !== 0) {
      return;
    }

    let cache = this.glyphsCache.cache

    if (this.currentScale !== this.glyphsCache.scale) {
      delete this.glyphsCache.cache;
      this.glyphsCache.cache = new Map<string, { dx: number, dy: number, canvas: HTMLCanvasElement }>()
      this.glyphsCache.scale = this.currentScale
      cache = this.glyphsCache.cache
    }

    const ctxTransform = ctx.getTransform();

    if (ctxTransform.a !== this.glyphsCache.scale) {
      return;
    }

    const hash = codepoint.toString() + ctx.fillStyle;// + lefttatweel.toString() + righttatweel.toString();
    let cached = cache.get(hash);
    if (!cached) {
      const canvas = document.createElement('canvas');

      const bbox = this.qurandata.glyphs[codepoint].bbox;

      const scale = this.scalePoint * ctxTransform.a;
      //[llx,lly,urx,ury]
      const scaledBbox = [bbox[0] * scale, bbox[1] * scale, bbox[2] * scale, bbox[3] * scale];

      canvas.width = Math.ceil(scaledBbox[2] - scaledBbox[0]) + 2;
      canvas.height = Math.ceil(scaledBbox[3] - scaledBbox[1]) + 2;
      const m_context = canvas.getContext("2d");

      const dx = Math.ceil(-scaledBbox[0]);
      const dy = Math.ceil(scaledBbox[3]);

      m_context.fillStyle = ctx.fillStyle;
      m_context.transform(ctxTransform.a, 0, 0, ctxTransform.d, dx, dy);
      m_context.scale(this.scalePoint, this.scalePoint);
      this.displayGlyph(codepoint, lefttatweel, righttatweel, m_context);
      cached = { dx, dy, canvas }
      cache.set(hash, cached);
    }

    return cached;

  }

}
