/*
 * Copyright 2012 Mozilla Foundation (Some code is derived from https://github.com/mozilla/pdf.js/blob/master/web/pdf_page_view.js)
 * Copyright (c) 2019-2020 Amine Anane. http: //digitalkhatt/license  
*/
import { MushafLayoutType, QuranTextService } from "../../services/qurantext.service";
import { TajweedService } from "../../services/tajweed.service";
import { LayoutService } from "./layout";

import { PageFormat } from './precomputed.component';

import { RenderingStates } from './rendering_states';

const PAGE_WIDTH = 17000;
const MARGIN = 300;
const LINE_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const INTERLINE = 1800



class PageView {
  renderingState: RenderingStates;
  private viewport: PageFormat;
  private loadingIconDiv;
  id;
  resume;

  public renderingId;
  zoomLayer;
  private lineJustify;
  private lastDrawTime;
  private pausePromise: Promise<Boolean>;
  private quranText: string[][];
  private ayaSvgGroup: SVGGElement
  private ayaLength: number;  
  constructor(public div, private pageIndex, lineJustify, viewport,
    private tajweedService: TajweedService,
    private quranTextService: QuranTextService,
    private layout : LayoutService) {
    this.renderingState = RenderingStates.INITIAL;
    this.lineJustify = lineJustify
    this.id = pageIndex + 1;
    this.renderingId = 'page' + this.id;

    this.viewport = viewport;

    this.div.style.width = this.viewport.width + 'px';
    this.div.style.height = this.viewport.height + 'px';


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

    const lineCount = this.layout.pages[this.pageIndex].lines.length;

    let temp = document.createElement('div');

    const scale = this.viewport.width / PAGE_WIDTH;

    let defaultMargin = MARGIN * scale
    let lineWidth = this.viewport.width - 2 * defaultMargin;

    const glyphScale = lineWidth / LINE_WIDTH;

    this.layout.initSimulation(this.pageIndex);

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineElem = document.createElement('div');

      let margin = defaultMargin

      lineElem.classList.add('line');

      lineElem.style.marginLeft = margin + "px";
      lineElem.style.marginRight = lineElem.style.marginLeft
      lineElem.style.height = INTERLINE * scale + "px";      
      this.lineJustify.appendChild(lineElem);


      this.layout.generateLine(lineElem, this.pageIndex, lineIndex, glyphScale, defaultMargin);

      temp.appendChild(lineElem);
      /*
      if (performance.now() - this.lastDrawTime > 16) {
        await new Promise(resolve => {
          requestAnimationFrame(resolve);
        })
        if (this.isPaused()) {
          const cont = await this.pausePromise
          if (!cont) return;
        } else if (this.renderingState !== RenderingStates.RUNNING) return;
        this.lastDrawTime = performance.now()
      }*/
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

    this.layout.simulatePage(this.pageIndex);

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
