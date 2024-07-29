/*
 * Copyright 2012 Mozilla Foundation (Some code is derived from https://github.com/mozilla/pdf.js/blob/master/web/pdf_page_view.js)
 * Copyright (c) 2019-2020 Amine Anane. http: //digitalkhatt/license  
*/

import { TajweedService } from '../../services/tajweed.service';
import { HBFeature, hb as HarfBuzz, HarfBuzzBuffer, HarfBuzzFont, getWidth, harfbuzzFonts } from "./harfbuzz";
import { PageFormat } from './hbmedina.component';
import { FONTSIZE, INTERLINE, JustResultByLine, LineTextInfo, MARGIN, PAGE_WIDTH, SPACEWIDTH, SpaceType, analyzeLineForJust, justifyLine } from './just.service';
import { QuranTextService } from './qurantext.service';
import { RenderingStates } from './rendering_states';


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
    this.ayaSvgGroup = svgAyaElem.firstElementChild as any



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

    const lineCount = this.quranText[this.pageIndex].length;

    let temp = document.createElement('div');

    const scale = this.viewport.width / PAGE_WIDTH;

    let defaultMargin = MARGIN * scale
    let lineWidth = this.viewport.width - 2 * defaultMargin;
    const fontSizeLineWidthRatio = this.viewport.fontSize / lineWidth

    // found minimum font size

    let maxFontSizeRatioWithoutOverFull = 1

    const glyphScale = this.viewport.fontSize / FONTSIZE

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineInfo = this.quranTextService.getLineInfo(this.pageIndex, lineIndex)
      if (lineInfo.lineType === 0 || (lineInfo.lineType == 2 && (this.pageIndex == 0 || this.pageIndex == 1))) {
        const lineText = this.quranText[this.pageIndex][lineIndex]

        const lineWidthUPEM = FONTSIZE / fontSizeLineWidthRatio

        const desiredWidth = lineInfo.lineWidthRatio * lineWidthUPEM;

        let currentLineWidth = getWidth(lineText, this.oldMedinaFont, FONTSIZE, null)

        if (desiredWidth < currentLineWidth) {
          maxFontSizeRatioWithoutOverFull = Math.min(desiredWidth / currentLineWidth, maxFontSizeRatioWithoutOverFull);
        }
      }
    }

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineInfo = this.quranTextService.getLineInfo(this.pageIndex, lineIndex)
      const lineElem = document.createElement('div');

      let margin = defaultMargin

      lineElem.classList.add('line');
      if (lineInfo.lineType === 0 || (lineInfo.lineType == 2 && (this.pageIndex == 0 || this.pageIndex == 1))) {
        if (lineInfo.lineWidthRatio !== 1) {

          const newlineWidth = lineWidth * lineInfo.lineWidthRatio
          margin += (lineWidth - newlineWidth) / 2
        }
        lineElem.style.marginLeft = margin + "px";
        lineElem.style.marginRight = lineElem.style.marginLeft
        lineElem.style.height = INTERLINE * scale + "px";
        const lineText = this.quranText[this.pageIndex][lineIndex]
        this.lineJustify.appendChild(lineElem);

        const lineTextInfo = analyzeLineForJust(this.quranTextService, this.pageIndex, lineIndex)

        const justResult = justifyLine(lineTextInfo, this.oldMedinaFont, fontSizeLineWidthRatio * maxFontSizeRatioWithoutOverFull / lineInfo.lineWidthRatio)
        justResult.fontSizeRatio = justResult.fontSizeRatio * maxFontSizeRatioWithoutOverFull

        /*if (lineInfo.lineType === 2) {
          justResult.globalFeatures = [{ name: 'basm', value: 1 }]
        }*/

        this.renderLine(lineElem, lineIndex, lineTextInfo, justResult, tajweedColor, glyphScale, defaultMargin)

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
      } else if (lineInfo.lineType === 2) /* basmala */ {
        lineElem.style.textAlign = "center"
        lineElem.style.marginLeft = margin + "px";
        lineElem.style.marginRight = lineElem.style.marginLeft
        lineElem.style.height = INTERLINE * scale + "px";
        this.lineJustify.appendChild(lineElem);
        const lineTextInfo = analyzeLineForJust(this.quranTextService, this.pageIndex, lineIndex)
        let justResult: JustResultByLine = {
          globalFeatures: [{ name: 'basm', value: 1 }],
          fontFeatures: new Map(),
          simpleSpacing: SPACEWIDTH,
          ayaSpacing: SPACEWIDTH,
          fontSizeRatio: 0.9
        }
        this.renderLine(lineElem, lineIndex, lineTextInfo, justResult, tajweedColor, glyphScale, defaultMargin,true)
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

  renderLine(lineElem: HTMLDivElement, lineIndex, lineTextInfo: LineTextInfo, justResult: JustResultByLine, tajweedColor: boolean, glyphScale: number, margin: number, center : boolean = false) {

    const lineText = this.quranText[this.pageIndex][lineIndex]

    const features: HBFeature[] = []

    for (const feat of justResult.globalFeatures || []) {
      features.push({
        tag: feat.name,
        value: feat.value,
        start: 0,
        end: -1
      })
    }

    if (justResult.fontFeatures?.size > 0) {
      for (let wordIndex = 0; wordIndex < lineTextInfo.wordInfos.length; wordIndex++) {
        const wordInfo = lineTextInfo.wordInfos[wordIndex]
        for (let i = wordInfo.startIndex; i <= wordInfo.endIndex; i++) {
          const justInfo = justResult.fontFeatures.get(i)
          if (justInfo) {
            for (let feat of justInfo) {
              features.push({
                tag: feat.name,
                value: feat.value,
                start: i,
                end: i + 1
              })
            }
          }
        }
      }
    }

    const tajweedResult = tajweedColor ? this.tajweedService.applyTajweed(this.quranText, this.pageIndex, lineIndex) : new Map()

    const buffer = new HarfBuzzBuffer()
    buffer.setDirection('rtl')
    buffer.setLanguage(HarfBuzz.arabLanguage)
    buffer.setScript(HarfBuzz.arabScript)
    buffer.setClusterLevel(1)
    buffer.addText(lineText)
    buffer.shape(this.oldMedinaFont, features)
    let result = buffer.json();
    buffer.destroy();

    const lineInfo = this.quranTextService.getLineInfo(this.pageIndex, lineIndex)

    let startSajdaIndex;
    let endSajdaIndex;


    if (lineInfo.sajda) {
      startSajdaIndex = lineTextInfo.wordInfos[lineInfo.sajda.startWordIndex].startIndex
      endSajdaIndex = lineTextInfo.wordInfos[lineInfo.sajda.endWordIndex].endIndex
    }

    var glyphs = new Map();

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('shape-rendering', 'geometricPrecision');
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

    const lineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(lineGroup);

    let currentxPos = 0

    let startSajdaPos;
    let endSajdaPos;

    for (let glyphIndex = result.length - 1; glyphIndex >= 0; glyphIndex--) {
      const glyph = result[glyphIndex]
      let pathString = glyphs.get(glyph.GlyphId)
      if (pathString === undefined) {

        pathString = this.oldMedinaFont.glyphToSvgPath(glyph.GlyphId)

        if (lineText.charCodeAt(glyph.Cluster) === 0x06DD) {
          pathString = [pathString.split("Z").slice(14).filter(a => a.length).join('Z')];
          glyphs.set(glyph.GlyphId, pathString)
        } else {
          glyphs.set(glyph.GlyphId, pathString)
        }

      }

      const space = lineTextInfo.spaces.get(glyph.Cluster)

      if (startSajdaIndex && glyph.Cluster === startSajdaIndex && !startSajdaPos) {
        startSajdaPos = currentxPos
      }

      if (endSajdaIndex && glyph.Cluster === endSajdaIndex && !endSajdaPos) {
        endSajdaPos = currentxPos
      }

      if (space === SpaceType.Aya) {
        currentxPos -= justResult.ayaSpacing;
      } else if (space === SpaceType.Simple) {
        currentxPos -= justResult.simpleSpacing;
      } else {
        currentxPos -= glyph.XAdvance;
      }

      if (pathString) {
        if (typeof pathString !== 'string') {
          //Aya

          const ayaGroup: SVGGElement = this.ayaSvgGroup.cloneNode(true) as any

          ayaGroup.setAttribute("transform", "scale (1,-1) translate(" + (currentxPos + glyph.XOffset) + " " + -885 + ")");
          lineGroup.appendChild(ayaGroup);

          pathString = pathString[0]

        }

        let newpath = document.createElementNS('http://www.w3.org/2000/svg', "path");
        newpath.setAttribute("d", pathString);

        newpath.setAttribute("transform", "translate(" + (currentxPos + glyph.XOffset) + " " + glyph.YOffset + ")");

        if (tajweedColor) {
          const tajweedClass = tajweedResult.get(glyph.Cluster)
          if (tajweedClass) {
            newpath.classList.add(tajweedClass)
          }
        }

        lineGroup.appendChild(newpath)

      }
    }

    if (startSajdaPos && endSajdaPos) {
      let line = document.createElementNS('http://www.w3.org/2000/svg', "line");
      line.setAttribute('x1', startSajdaPos)
      line.setAttribute('x2', endSajdaPos)
      line.setAttribute('y1', "1000")
      line.setAttribute('y2', "1000")
      line.setAttribute('stroke', 'black')
      line.setAttribute('stroke-width', '60')
      lineGroup.appendChild(line)
    }


    lineGroup.setAttribute("transform", "scale(" + glyphScale * justResult.fontSizeRatio + "," + -glyphScale * justResult.fontSizeRatio + ")");

    //lineGroup.transform.baseVal.getItem(0).setScale(this.viewport.scale, this.viewport.scale);

    const lineWidth = -glyphScale * currentxPos
    const x = lineWidth * 2
    let width = x + margin
    

    const height = lineElem.clientHeight * 2

    svg.setAttribute('viewBox', `${-x} ${-height / 2} ${width} ${height}`)
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.position = "relative"
    if (center) {
      const rightMargin = (lineElem.clientWidth - lineWidth ) / 2 + margin
      svg.style.right = rightMargin + "px";
    } else {
      svg.style.right = -margin + "px";
    }
    
    svg.style.top = -lineElem.clientHeight / 2 + "px";

    lineElem.appendChild(svg);

  }

  applyTajweed(tajweedColor, lineElem: HTMLElement, lineIndex) {

    const lineText = this.quranText[this.pageIndex][lineIndex]

    if (!tajweedColor) {

      lineElem.textContent = lineText;
      return;
    }

    const result = this.tajweedService.applyTajweed(this.quranText, this.pageIndex, lineIndex)

    for (let i = 0; i < lineText.length; i++) {
      const char = lineText.charAt(i)
      const tajweed = result.get(i)
      if (tajweed) {
        if (lineElem.lastChild && lineElem.lastChild.nodeType == Node.ELEMENT_NODE) {
          const node = lineElem.lastChild as HTMLElement
          if (node.classList === tajweed) {
            node.textContent = node.textContent + char
            continue
          }
        }
        const span = document.createElement('span');
        span.classList.add(tajweed)
        span.textContent = char
        lineElem.appendChild(span)

      } else {
        if (lineElem.lastChild && lineElem.lastChild.nodeType == Node.TEXT_NODE) {
          lineElem.lastChild.textContent = lineElem.lastChild.textContent + char
        } else {
          lineElem.appendChild(document.createTextNode(char))
        }
      }
    }


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
