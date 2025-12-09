/*
 * Copyright 2012 Mozilla Foundation (Some code is derived from https://github.com/mozilla/pdf.js/blob/master/web/pdf_page_view.js)
 * Copyright (c) 2019-2020 Amine Anane. http: //digitalkhatt/license  
*/
import { MushafLayoutType, QuranTextService } from "../../services/qurantext.service";
import { TajweedService } from "../../services/tajweed.service";
import { HBFeature, hb as HarfBuzz, HarfBuzzBuffer, HarfBuzzFont, getWidth, harfbuzzFonts } from "./harfbuzz";
import { FONTSIZE, INTERLINE, JustResultByLine, JustStyle, LineTextInfo, MARGIN, PAGE_WIDTH, SpaceType, analyzeLineForJust, justifyLine } from './just.service';
import { PageFormat } from "./otfmushaf.component";

import { RenderingStates } from './rendering_states';

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

class PageView {
  renderingState: RenderingStates;
  private viewport: PageFormat;
  private loadingIconDiv;
  id;
  resume;

  public renderingId;
  zoomLayer;
  private calculatewidthElem;
  private lineJustify;
  private lastDrawTime;
  private maxIterTime = 8000
  private pausePromise: Promise<Boolean>;
  private quranText: string[][];
  private oldMedinaFont: HarfBuzzFont
  private ayaSvgGroup: SVGGElement
  private ayaLength: number;
  private spaceWidth;
  private justStyle = JustStyle.XScale
  constructor(public div, private pageIndex, calculatewidthElem, lineJustify, viewport,
    private tajweedService: TajweedService, private quranTextService: QuranTextService) {
    this.renderingState = RenderingStates.INITIAL;

    this.calculatewidthElem = calculatewidthElem
    this.lineJustify = lineJustify
    this.id = pageIndex + 1;
    this.renderingId = 'page' + this.id;

    this.viewport = viewport;

    this.div.style.width = this.viewport.width + 'px';
    this.div.style.height = this.viewport.height + 'px';
    this.oldMedinaFont = harfbuzzFonts.get("oldmadina")

    const svgAyaElem: SVGSVGElement = document.getElementById("ayaGlyph") as any
    this.ayaSvgGroup = svgAyaElem?.firstElementChild as SVGGElement;
    this.ayaLength = quranTextService.mushafType == MushafLayoutType.OldMadinah ? 3
      : quranTextService.mushafType == MushafLayoutType.NewMadinah ? 14
        : 0;



    /*
    this.loadingIconDiv = document.createElement('div');
    this.loadingIconDiv.className = 'loadingIcon';
    div.appendChild(this.loadingIconDiv);*/

    this.zoomLayer = null;

    this.quranText = quranTextService.quranText;

    this.spaceWidth = getWidth(" ", this.oldMedinaFont, FONTSIZE, null);
  }

  pause() {
    if (this.renderingState === RenderingStates.RUNNING && this.resume == null) {
      this.renderingState = RenderingStates.PAUSED
      this.pausePromise = new Promise((resolve, reject) => {
        this.resume = () => {
          if (this.renderingState === RenderingStates.PAUSED) {
            resolve(true)
            this.renderingState = RenderingStates.RUNNING
          } else {
            resolve(false)
          }
          this.resume = null;
        }
      });
    }

  }

  private isPaused() {
    return this.renderingState === RenderingStates.PAUSED
  }

  async draw(canvasWidth, canvasHeight, texFormat, tajweedColor) {

    let startDraw = performance.now();

    if (this.renderingState !== RenderingStates.INITIAL) {
      return;
    }


    this.lastDrawTime = performance.now()

    const pageElem = this.div;

    this.renderingState = RenderingStates.RUNNING;

    this.lineJustify.style.width = pageElem.style.width;
    this.lineJustify.style.fontSize = pageElem.style.fontSize

    const lineCount = this.quranText[this.pageIndex].length;

    let temp = document.createElement('div');

    const scale = this.viewport.width / PAGE_WIDTH;

    let defaultMargin = MARGIN * scale
    let lineWidth = this.viewport.width - 2 * defaultMargin;
    const fontSizeLineWidthRatio = this.viewport.fontSize / lineWidth

    // found minimum font size

    let minRatio = 100;
    let maxRatio = 0;

    const glyphScale = this.viewport.fontSize / FONTSIZE

    const fontSizeRatio: number[] = [];

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineInfo = this.quranTextService.getLineInfo(this.pageIndex, lineIndex)
      if (lineInfo.lineType === 0 || (lineInfo.lineType == 2 && (this.pageIndex == 0 || this.pageIndex == 1))) {
        const lineText = this.quranText[this.pageIndex][lineIndex]

        const lineWidthUPEM = FONTSIZE / fontSizeLineWidthRatio

        const desiredWidth = lineInfo.lineWidthRatio * lineWidthUPEM;

        let currentLineWidth = getWidth(lineText, this.oldMedinaFont, FONTSIZE, null)

        const ratio = desiredWidth / currentLineWidth;
        fontSizeRatio[lineIndex] = ratio;
        minRatio = Math.min(ratio, minRatio);
        maxRatio = Math.max(ratio, maxRatio);
      }
    }
    let tajweedResult
    if (tajweedColor) {
      const startTime = performance.now();
      tajweedResult = this.tajweedService.applyTajweedByPage(this.quranTextService, this.pageIndex)
      const endTime = performance.now();
      //console.log(`applyTajweed in page ${this.pageIndex + 1} takes ${endTime - startTime} ms`)
    }

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const bism = (this.pageIndex === 0 || this.pageIndex === 1) && (lineIndex == 1);
      const lineInfo = this.quranTextService.getLineInfo(this.pageIndex, lineIndex)
      const lineElem = document.createElement('div');

      let margin = defaultMargin

      lineElem.classList.add('line');
      if (lineInfo.lineType === 0 && !bism) {
        if (lineInfo.lineWidthRatio !== 1) {

          const newlineWidth = lineWidth * lineInfo.lineWidthRatio
          margin += (lineWidth - newlineWidth) / 2
        }
        lineElem.style.marginLeft = margin + "px";
        lineElem.style.marginRight = lineElem.style.marginLeft
        lineElem.style.height = INTERLINE * scale + "px";
        const lineText = this.quranText[this.pageIndex][lineIndex]

        const innerSpan = document.createElement('div');
        innerSpan.classList.add("justifyline")
        if (lineInfo.sajda) {
          innerSpan.innerHTML = lineText.replace(lineInfo.sajda.text,`<span class ='sajda'>${lineInfo.sajda.text}</span>`);
        }else{
          innerSpan.textContent = lineText;
        }              
        innerSpan.style.lineHeight = lineElem.style.height
        innerSpan.style.fontSize = this.viewport.fontSize + "px"
        lineElem.appendChild(innerSpan);

      } else if (lineInfo.lineType === 1) {
        lineElem.style.textAlign = "center"
        lineElem.style.marginLeft = margin + "px";
        lineElem.style.marginRight = lineElem.style.marginLeft
        lineElem.style.height = INTERLINE * scale + "px";
        const lineText = this.quranText[this.pageIndex][lineIndex]

        lineElem.classList.add("linesuran")
        if (this.pageIndex === 0 || this.pageIndex === 1) {
          lineElem.style.paddingBottom = 2 * scale * INTERLINE + "px"
        }
        const innerSpan = document.createElement('span');
        innerSpan.textContent = lineText;
        innerSpan.classList.add("innersura")
        innerSpan.style.lineHeight = lineElem.style.height
        innerSpan.style.fontSize = this.viewport.fontSize * 0.9 + "px"
        lineElem.appendChild(innerSpan);
      } else if (lineInfo.lineType === 2 || bism) /* basmala */ {
        lineElem.style.textAlign = "center"
        lineElem.style.marginLeft = margin + "px";
        lineElem.style.marginRight = lineElem.style.marginLeft
        lineElem.style.height = INTERLINE * scale + "px";

        const lineText = this.quranText[this.pageIndex][lineIndex]

        lineElem.classList.add("linebism")

        const innerSpan = document.createElement('span');
        innerSpan.textContent = lineText;
        if (this.pageIndex == 0 || this.pageIndex == 1) {
          innerSpan.classList.add("bismfeature")
          if (isSafari) {
            if(this.quranTextService.mushafType != MushafLayoutType.IndoPak15Lines){
              innerSpan.style.left = 350 * scale + "px";
            }            
            innerSpan.style.fontSize = this.viewport.fontSize + "px"
          }
        } else {
          innerSpan.classList.add("basmfeature");
          if (isSafari) {
            if(this.quranTextService.mushafType === MushafLayoutType.NewMadinah){
              innerSpan.style.left = 700 * scale + "px";
            } else if(this.quranTextService.mushafType == MushafLayoutType.OldMadinah){
              innerSpan.style.right = 1500 * scale + "px";
            }              
            innerSpan.style.fontSize = this.viewport.fontSize * 0.9 + "px"
          }
        }

        innerSpan.style.lineHeight = lineElem.style.height
        innerSpan.style.fontSize = this.viewport.fontSize * 0.95 + "px"
        lineElem.appendChild(innerSpan);
      }

      temp.appendChild(lineElem);
      if (performance.now() - this.lastDrawTime > 16) {
        await new Promise(resolve => {
          requestAnimationFrame(resolve);
        })
        if (this.isPaused()) {
          const cont = await this.pausePromise
          if (!cont) return;
        } else if (this.renderingState !== RenderingStates.RUNNING) return;
        this.lastDrawTime = performance.now()
      }
    }

    while (temp.firstChild) {
      pageElem.appendChild(temp.firstChild);
    }

    this.renderingState = RenderingStates.FINISHED;

    if (this.loadingIconDiv) {
      this.div.removeChild(this.loadingIconDiv);
      delete this.loadingIconDiv;
    }

    let endDraw = performance.now();
    console.info(`draw page ${this.id} take ${endDraw - startDraw} ms`)

  }
  reset(keepZoomLayer = false) {

    const div = this.div;
    div.style.width = this.viewport.width + 'px';
    div.style.height = this.viewport.height + 'px';
    div.style.fontSize = this.viewport.fontSize + 'px';

    this.renderingState = RenderingStates.INITIAL;


    if (this.resume) {
      this.resume();
    }

    div.removeAttribute('data-loaded');



    const currentZoomLayerNode = (keepZoomLayer && this.zoomLayer) || null;

    while (div.firstChild) {
      div.removeChild(div.lastChild);
    }


  }

  update(viewport, duringZoom: boolean = false) {
    this.viewport = viewport;


    if (this.zoomLayer) {
      this.zoomLayer.style.width = this.viewport.width + 'px';
      this.zoomLayer.style.height = this.viewport.height + 'px';
    }

    this.reset(true);
  }

  destroy() {
    this.reset(false);
  }

  private resetZoomLayer(removeFromDOM = false) {
    if (!this.zoomLayer) {
      return;
    }
    let zoomLayerCanvas = this.zoomLayer; //.firstChild;
    //this.paintedViewportMap.delete(zoomLayerCanvas);
    // Zeroing the width and height causes Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    zoomLayerCanvas.width = 0;
    zoomLayerCanvas.height = 0;

    if (removeFromDOM) {
      // Note: `ChildNode.remove` doesn't throw if the parent node is undefined.
      this.zoomLayer.remove();
    }
    this.zoomLayer = null;
  }

}

export { PageView };
