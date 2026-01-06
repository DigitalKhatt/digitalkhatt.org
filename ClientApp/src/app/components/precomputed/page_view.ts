/*
 * Copyright 2012 Mozilla Foundation (Some code is derived from https://github.com/mozilla/pdf.js/blob/master/web/pdf_page_view.js)
 * Copyright (c) 2019-2020 Amine Anane. http: //digitalkhatt/license
*/
import { MushafLayoutType, QuranTextService } from "../../services/qurantext.service";
import { TajweedService } from "../../services/tajweed.service";
import {
  LayoutService,
  PAGE_WIDTH,
  MARGIN,
  LINE_WIDTH,
  INTERLINE,
  baseForce,
  markbaseforce,
} from '@digitalkhatt/quran-engine';
import * as d3Force from "d3-force";

import { PageFormat } from './precomputed.component';

import { RenderingStates } from './rendering_states';

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
    private layout: LayoutService) {
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

    const pageLayout = this.layout.getPageLayout(this.pageIndex);
    if (!pageLayout) {
      this.renderingState = RenderingStates.FINISHED;
      return;
    }

    const lineCount = pageLayout.lines.length;

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


      this.generateLine(lineElem, this.pageIndex, lineIndex, glyphScale, defaultMargin);

      temp.appendChild(lineElem);
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

    this.simulatePage(this.pageIndex);

  }

  /**
   * Generate SVG line content using quran-engine LayoutService
   */
  private generateLine(lineElem: HTMLElement, pageIndex: number, lineIndex: number, glyphScale: number, margin: number) {
    const linelayout = this.layout.getLineLayout(pageIndex, lineIndex);
    if (!linelayout) return;

    const glyphs = this.layout.glyphs;
    const pageNodes = this.layout.getSimulationNodes(pageIndex);

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('shape-rendering', 'geometricPrecision');
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

    const lineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(lineGroup);

    let currentBase: any;

    let currentxPos = -linelayout.x;
    for (let glyphIndex = 0; glyphIndex < linelayout.glyphs.length; glyphIndex++) {
      const glyph = linelayout.glyphs[glyphIndex];
      currentxPos -= glyph.x_advance || 0;
      const pathString = this.layout.getGlyphPath(glyph.codepoint, glyph.lefttatweel || 0, glyph.righttatweel || 0);
      let newpath = document.createElementNS('http://www.w3.org/2000/svg', "path");
      newpath.setAttribute("d", pathString);

      const posX = currentxPos + (glyph.x_offset || 0);
      const posY = glyph.y_offset || 0;

      const glyphInfo = glyphs[glyph.codepoint];
      if (glyphInfo && glyphInfo.classes?.marks) {
        const markNode = { isMark: true, x: 0, y: 0, posX, posY, path: newpath, baseNode: currentBase, x_offset: glyph.x_offset || 0, y_offset: glyph.y_offset || 0 };
        pageNodes.push(markNode as any);
      } else {
        const baseNode = {
          x: 0, y: 0, posX, posY, path: newpath
        }
        pageNodes.push(baseNode as any);
        currentBase = baseNode;
      }

      lineGroup.appendChild(newpath)
    }

    const xScale = linelayout.xscale || 1;
    const yScale = 1;

    lineGroup.setAttribute("transform", "scale(" + glyphScale * xScale + "," + -glyphScale * yScale + ")");
    const lineWidth = -glyphScale * xScale * currentxPos
    const x = lineWidth * 1.2
    let width = x + margin;
    const height = lineElem.clientHeight * 2

    svg.setAttribute('viewBox', `${-x} ${-height / 2} ${width} ${height}`)
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.position = "relative"
    svg.style.right = -margin + "px";
    svg.style.top = -lineElem.clientHeight / 2 + "px";

    lineElem.appendChild(svg);
  }

  /**
   * Run D3 force simulation for mark positioning
   */
  private simulatePage(pageIndex: number) {
    const pageNodes = this.layout.getSimulationNodes(pageIndex);

    const simulation = d3Force.forceSimulation(pageNodes as any)

    simulation.force("baseForce", baseForce());
    simulation.force("marktobase", markbaseforce());

    simulation.on("tick", () => {
      for (let i = 0; i < pageNodes.length; i++) {
        const node = pageNodes[i] as any;
        if (!isNaN(node.x) && !isNaN(node.y) && node.path) {
          node.path.setAttribute("transform", "translate(" + node.x + " " + node.y + ")");
        }
      }
    });
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
