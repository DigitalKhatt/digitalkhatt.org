/*
 * Copyright 2012 Mozilla Foundation (Some code is derived from https://github.com/mozilla/pdf.js/blob/master/src/display/api.js)
 * Copyright (c) 2019-2020 Amine Anane. http: //digitalkhatt/license
 * This file is part of DigitalKhatt.
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

class InternalRenderTask {

  lineIndex;
  //pageResult
  //page;
  //originalPage;
  mapScale;
  textContent = [];
  newLines = {};
  ystartposition;
  promiseCapability;
  cancelled;


  constructor(private shaper, private token, private pageIndex, private ctx, private texFormat, private tajweedColor, private changeSize) {
    this.mapScale = shaper.scalePoint * 1000 * shaper.matrix[0] * 2;

    ctx.transform(shaper.matrix[0], 0, 0, shaper.matrix[3], 0, shaper.matrix[5]);

    //this.pageResult = shaper.quranShaper.shapePage(pageIndex, shaper.fontScalePerc, shaper.useJustification);

    //this.page = this.pageResult.page;
    //this.originalPage = this.pageResult.originalPage;

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
  }

  render() {
    this._continue();
    return this.promiseCapability.promise;

  }



  iteration() {

    if (this.token.isCancelled()) {

      return;
    }

    const ctx = this.ctx;
    const shaper = this.shaper;

    let scale;
    let xoffest;

    const pageResult = shaper.quranShaper.shapePage(this.pageIndex, shaper.fontScalePerc, shaper.useJustification, this.lineIndex, this.texFormat, this.tajweedColor, this.changeSize);

    const page = pageResult.page;
    const originalPage = pageResult.originalPage;

    const line = page.value(0);
    const originalLine = originalPage.get(0);

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

    let currentxPos = shaper.lineWidth + shaper.margin - line.xstartposition;
    const currentyPos = this.ystartposition;

    if (this.pageIndex === 0 || this.pageIndex === 1) {
      this.ystartposition += this.shaper.InterLineSpacingFirtPage;
    } else {
      this.ystartposition += this.shaper.InterLineSpacing;
    }


    let lastPos = { x: currentxPos, y: currentyPos };

    ctx.save();

    let mapScale = this.mapScale;

    if (line.type.value === 1) { //Sura

      const ratio = shaper.fontScalePerc > 0.8 ? 0.8 / shaper.fontScalePerc : 1;
      const currentlineWidth = -(2 * line.xstartposition - shaper.lineWidth) * ratio;
      const xstartposition = (shaper.lineWidth - currentlineWidth) / 2;
      const newX = shaper.lineWidth + shaper.margin - xstartposition

      const height = shaper.TopSpace;

      const ayaFrameyPos = currentyPos - 3 * height / 5;

      ctx.drawImage(shaper.suraImage, shaper.margin, ayaFrameyPos, shaper.lineWidth, height);

      ctx.transform(ratio, 0, 0, -ratio, newX, lastPos.y);



      //var point = new DOMPoint(currentxPos, ayaFrameyPos);
      //var transformedPoint = point.matrixTransform(this.matrix);
      //console.log("transformedPoint=(" + transformedPoint.x + "," + transformedPoint.y + ")");
      mapScale = mapScale * ratio;

      if (shaper.generateOutline) {
        const suraNumber = shaper.outline.length + 1;

        shaper.outline.push({
          "dest": [
            {
              "num": this.pageIndex,
              "gen": 0
            },
            {
              "name": "XYZ"
            },
            currentxPos * shaper.scale,
            shaper.matrix[5] - ayaFrameyPos * shaper.scale,
            0
          ],
          "url": null,
          "title": originalLine.toStdString() + " ( " + suraNumber + " )",
          "color": { "0": 0, "1": 0, "2": 0 },
          "bold": false,
          "italic": false,
          "items": []
        });
      }


      scale = shaper.scale * ratio;
      xoffest = (lastPos.x - shaper.margin) * shaper.scale - lastPos.x * scale;

    }
    else if (line.type.value === 2) { //Bism
      const ratio = shaper.fontScalePerc > 0.85 ? 0.85 / shaper.fontScalePerc : 1;
      const currentlineWidth = -(2 * line.xstartposition - shaper.lineWidth) * ratio;
      const xstartposition = (shaper.lineWidth - currentlineWidth) / 2;
      const newX = shaper.lineWidth + shaper.margin - xstartposition
      ctx.transform(ratio, 0, 0, -ratio, newX, lastPos.y - (200 << shaper.SCALEBY));
      mapScale = mapScale * ratio;
      scale = shaper.scale * ratio;
      xoffest = (lastPos.x - (600 << shaper.SCALEBY)) * shaper.scale - lastPos.x * scale; //16;
    }
    else {
      ctx.transform(1, 0, 0, -1, lastPos.x, lastPos.y);
      mapScale = mapScale;
      scale = shaper.scale;
      xoffest = 0;
    }

    const glyphs = line.glyphs;

    const glyphNumber = glyphs.size();


    var currentcluster = -1;
    var begincluster = -1;
    var textItem: any = {};
    var originalLineSize = originalLine.size();
    var beginsajda;
    var endsajda;

    for (let glyphIndex = 0; glyphIndex < glyphNumber; glyphIndex++) {

      const glyph = glyphs.get(glyphIndex);


      if (shaper.generateText) {
        const unicode = originalLine.unicode(glyph.cluster); //originalLine.at(glyph.cluster).unicode();


        if (currentcluster === glyph.cluster || unicode === 0x0640) {// || unicode == 0x06E5 || unicode == 0x06E6 || unicode == 0x0640) {                    
          textItem.width += glyph.x_advance * scale;
          textItem.transform[4] = textItem.transform[4] - glyph.x_advance * scale;
          currentcluster = glyph.cluster;
        } else {
          if (begincluster !== -1) {
            for (let cluster = begincluster; cluster < glyph.cluster; cluster++) {
              const unicode = originalLine.unicode(glyph.cluster);
              textItem.str += String.fromCodePoint(unicode);
            }
          }

          textItem = {
            str: "",
            "dir": "rtl",
            "width": glyph.x_advance * scale,
            "height": mapScale,
            "transform": [
              mapScale,
              0,
              0,
              mapScale,
              xoffest + currentxPos * scale - glyph.x_advance * scale,
              410 - currentyPos * shaper.scale
            ],
            "fontName": "f1"
          };
          this.textContent.push(textItem);

          currentcluster = glyph.cluster;
          begincluster = currentcluster;

        }
      }


      if (glyph.color) {
        const color = glyph.color;
        //*d_ep->currentPage << ((color >> 24) & 0xff) / 255.0 << ((color >> 16) & 0xff) / 255.0 << ((color >> 8) & 0xff) / 255.0 << "scn\n";
        const style = "rgb(" + ((color >> 24) & 0xff) + "," + ((color >> 16) & 0xff) + "," + ((color >> 8) & 0xff) + ")";
        ctx.fillStyle = style;
      }

      const pos = { x: 0, y: 0 };
      currentxPos -= glyph.x_advance;
      pos.x = currentxPos + glyph.x_offset;
      pos.y = currentyPos - glyph.y_offset;

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
      /*
      var canvas = this.getChached(glyph.codepoint, glyph.lefttatweel, glyph.righttatweel,ctx);                
      if (canvas) {
          ctx.save();
          var tt = ctx.getTransform();                   
          ctx.resetTransform();                    ctx.transform(1, 0,0, 1, tt.e, tt.f);

          ctx.drawImage(canvas, -100, -100);
          ctx.restore();
      } else {                    
          ctx.save();
          ctx.scale(this.scalePoint, this.scalePoint);
          this.quranShaper.displayGlyph(glyph.codepoint, glyph.lefttatweel, glyph.righttatweel, ctx);
          ctx.restore();
      }*/
      ctx.save();
      const scalePoint = line.fontSize;
      ctx.scale(scalePoint, scalePoint);
      shaper.quranShaper.displayGlyph(glyph.codepoint, glyph.lefttatweel, glyph.righttatweel, ctx);
      ctx.restore();



      if (glyph.color) {
        ctx.fillStyle = 'rgb(0,0,0)';
      }
    }

    if (shaper.generateText) {
      for (var cluster = begincluster; cluster < originalLineSize; cluster++) {
        var unicode = originalLine.unicode(cluster); //originalLine.unicode(cluster); //originalLine.at(cluster).unicode();
        textItem.str += String.fromCodePoint(unicode);
      }

      this.newLines[this.textContent.length - 1] = true;
    }


    ctx.restore();

    if (beginsajda && endsajda) {

      if (beginsajda.y != endsajda.y) {
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

    glyphs.delete();
    originalLine.delete();
    page.delete();
    originalPage.delete();
    pageResult.delete();
    this.shaper.quranShaper.clearAlternates();
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

  private _scheduleNext() {

    if (this.cancelled) {
      return;
    }

    requestAnimationFrame(() => this._next());
  }

  _next() {
    this.iteration();
    this.lineIndex++;
    if (this.lineIndex < this.getNumberOfLines()) {
      this._continue();
    } else {
      if (this.shaper.generateText) {
        //this.textContentbyPage[pageIndex] = { items: textContent, newLines: newLines }; 
        //var textPromiseCap = this.getTextContentPromise(pageIndex);
        //textPromiseCap.resolve(textContent);
      }

      this.promiseCapability.resolve();
    }

  }
}

class QuranShaper {

  private SCALEBY = 8;
  private fontScalePerc;
  private margin = 400 << this.SCALEBY;
  private lineWidth = (17000 - (2 * 400)) << this.SCALEBY;
  private pagewidth = 17000 << this.SCALEBY;
  private TopSpace = 1450 << this.SCALEBY;
  private InterLineSpacing = 1800 << this.SCALEBY;
  private InterLineSpacingFirtPage = 2025 << this.SCALEBY;
  private suraImage: HTMLImageElement;
  private module: any;
  private cachedGlyphs: any;
  private scalePoint: number;
  private matrix;
  private scale: number;

  private textContentbyPage;
  private textStyles;
  private textContentbyPagePromise;
  private outline;

  private generateOutline;
  private generateText;


  public quranShaper: any;
  public useJustification = true;
  constructor(quranShaper, module) {
    this.quranShaper = quranShaper;
    this.suraImage = new Image();

    this.suraImage.src = "assets/ayaframe.svg";
    this.module = module;

    this.setScalePoint(1);

    this.cachedGlyphs = [];

    this.scale = 72. / (4800 << this.SCALEBY);
    this.matrix = [this.scale, 0, 0, -this.scale, 0, 410];

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

  setScalePoint(percent) {
    this.fontScalePerc = percent;
    this.scalePoint = (1 << this.SCALEBY) * this.fontScalePerc;
  }

  getTexNbPages() {
    return this.quranShaper.getTexNbPages();
  }

  getOutline(tex: boolean) {
    var outline = this.quranShaper.getSuraLocations(tex);
    let size = outline.size();

    var positions = [];

    for (let i = 0; i < size; i++) {
      let position = outline.value(i);
      let name = position.name.toStdString();
      position.name.delete();
      position.name = name;
      positions.push(position);
    }

    outline.delete();

    return positions;
  }

  getTextContent(pageIndex) {
    return { styles: this.textStyles, items: this.textContentbyPage[pageIndex].items, newLines: this.textContentbyPage[pageIndex].newLines };
  }

  /*
  getTextContentPromise(pageIndex) {
      if (!this.textContentbyPagePromise[pageIndex]) {           
          this.textContentbyPagePromise[pageIndex] = createPromiseCapability();
      }

      var textContent = this.textContentbyPage[pageIndex];

      if (!textContent) {
          let canvas : any = document.createElement("CANVAS");            
          let ctx = canvas.getContext('2d', { alpha: false, });                        
          this.printPage(pageIndex, ctx,null)

      }

      this.textContentbyPagePromise[pageIndex].resolve(this.getTextContent(pageIndex));

      return this.textContentbyPagePromise[pageIndex];
  }*/

  async printPage(pageIndex, ctx: CanvasRenderingContext2D, token: any, texFormat, tajweedColor, changeSize) {

    if (token.isCancelled()) {
      return;
    }


    const task = new InternalRenderTask(this, token, pageIndex, ctx, texFormat, tajweedColor, changeSize);

    await task.render();

  }

  getChached(codepoint, lefttatweel, righttatweel, ctx: CanvasRenderingContext2D) {
    var transform = ctx.getTransform();

    var hash = transform.a.toString() + codepoint.toString() + ctx.fillStyle + lefttatweel.toString() + righttatweel.toString();
    var canvas = this.cachedGlyphs[hash];
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      var m_context = canvas.getContext("2d");

      var tt = ctx.getTransform();
      //m_context.currentTransform = transform;
      //m_context.transform(1, 0, 0, 1, 25, 25);
      m_context.transform(tt.a, 0, 0, tt.d, 100, 100);
      m_context.scale(this.scalePoint, this.scalePoint);
      m_context.fillStyle = ctx.fillStyle;

      this.quranShaper.displayGlyph(codepoint, lefttatweel, righttatweel, m_context);
      this.cachedGlyphs[hash] = canvas;
    }

    return canvas;

  }

  executeMetapost(code: string): number {
    return this.quranShaper.executeMetapost(code);
  }

  getGlyphCode(name: string): number {
    return this.quranShaper.getGlyphCode(name);
  }

  displayGlyph(glyphCode: number, leftTatweel: number, righttatweel: number, ctx: CanvasRenderingContext2D) {
    this.quranShaper.displayGlyph(glyphCode, leftTatweel, righttatweel, ctx);
  }

  drawPathByName(name: string, ctx: CanvasRenderingContext2D) {
    this.quranShaper.drawPathByName(name, ctx);
  }
  shapeText(text, lineWidth, fontScalePerc, applyJustification, tajweedColor, ctx) {
    return this.quranShaper.shapeText(text, lineWidth, fontScalePerc, applyJustification, tajweedColor, ctx);
  }
}



export { QuranShaper }
