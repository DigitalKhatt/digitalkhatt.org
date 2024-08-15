/*
 * Copyright 2012 Mozilla Foundation (Some code is derived from https://github.com/mozilla/pdf.js/blob/master/web/pdf_page_view.js)
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
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with DigitalKhatt. If not, see
 * <https: //www.gnu.org/licenses />.
*/

import { RenderingStates } from './rendering_states';
import { BooleanLiteral } from 'typescript';
import { TajweedService } from '../../services/tajweed.service';
import { QuranTextService } from '../../services/qurantext.service';
import { OldMedinaComponent } from './oldmedina.component';

class PageView {
  renderingState: RenderingStates;
  private viewport;
  private canvas;
  private loadingIconDiv;
  id;
  resume;

  public renderingId;
  zoomLayer;
  hasRestrictedScaling;
  private calculatewidthElem;
  private lineJustify;
  private lastDrawTime;
  private maxIterTime = 8000
  private pausePromise: Promise<Boolean>;
  private spaceWidth;
  private quranText;
  constructor(public div, private index, calculatewidthElem, lineJustify, viewport,
    private tajweedService: TajweedService, private quranTextService: QuranTextService) {
    this.renderingState = RenderingStates.INITIAL;

    this.calculatewidthElem = calculatewidthElem
    this.lineJustify = lineJustify
    this.id = index + 1;
    this.renderingId = 'page' + this.id;

    this.viewport = viewport;

    this.div.style.width = this.viewport.width + 'px';
    this.div.style.height = this.viewport.height + 'px';


    /*
    this.loadingIconDiv = document.createElement('div');
    this.loadingIconDiv.className = 'loadingIcon';
    div.appendChild(this.loadingIconDiv);*/

    this.zoomLayer = null;

    this.hasRestrictedScaling = false;

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

  async draw(canvasWidth, canvasHeight, texFormat, tajweedColor, hasRestrictedScaling) {

    let startDraw = performance.now();

    if (this.renderingState !== RenderingStates.INITIAL) {
      return;
    }


    this.lastDrawTime = performance.now()

    const pageElem = this.div;

    this.spaceWidth = this.getTextWidthDOM(" ", this.getCanvasFont(pageElem));

    this.renderingState = RenderingStates.RUNNING;

    this.lineJustify.style.width = pageElem.style.width;
    this.lineJustify.style.fontSize = pageElem.style.fontSize

    const lineCount = this.quranText[this.index].length;

    let temp = document.createElement('div');

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineInfo = this.quranTextService.getLineInfo(this.index, lineIndex)
      const lineElem = document.createElement('div');
      let margin = OldMedinaComponent.DEFAULT_PAGE_SIZE.marginWidth * this.viewport.scale

      lineElem.classList.add('line');
      if (lineInfo.lineType === 0 || (lineInfo.lineType == 2 && (this.index == 0 || this.index == 1))) {
        if (lineInfo.lineWidthRatio !== 1) {
          let lineWidth = this.viewport.width - 2 * margin;
          const newlineWidth = lineWidth * lineInfo.lineWidthRatio
          margin += (lineWidth - newlineWidth) / 2
        }
        lineElem.style.marginLeft = margin + "px";
        lineElem.style.marginRight = lineElem.style.marginLeft

        //const start = performance.now()
        this.applyTajweed(tajweedColor, lineElem, lineIndex)
        //console.log(`applyTajweed=${performance.now() - start}`)
        this.lineJustify.appendChild(lineElem);
        this.initElem(lineElem)
        if (lineInfo.sajda) {
          const starNode = lineInfo.sajda.startWordIndex + (lineInfo.sajda.startWordIndex)
          const endNode = lineInfo.sajda.endWordIndex + (lineInfo.sajda.endWordIndex)
          const div = lineElem.firstElementChild
          for (let childIndex = starNode; childIndex <= endNode; childIndex++) {
            div.children[childIndex].classList.add("sajda")
          }
        }
        await this.applyJustification(lineElem, true);
      } else if (lineInfo.lineType === 1) {
        lineElem.style.textAlign = "center"
        lineElem.style.marginLeft = margin + "px";
        lineElem.style.marginRight = lineElem.style.marginLeft
        const lineText = this.quranText[this.index][lineIndex]

        lineElem.classList.add("linesuran")
        if (this.index === 0 || this.index === 1) {
          lineElem.style.paddingBottom = ((1.77 * 2) + 0.2) + "em"
        }
        const innerSpan = document.createElement('span');
        innerSpan.textContent = lineText;
        innerSpan.classList.add("innersura")
        lineElem.appendChild(innerSpan);
      } else if (lineInfo.lineType === 2) /* basmala */ {
        this.applyTajweed(tajweedColor, lineElem, lineIndex)
        lineElem.style.textAlign = "center"
        lineElem.style.marginLeft = margin + "px";
        lineElem.style.marginRight = lineElem.style.marginLeft
        const lineText = this.quranText[this.index][lineIndex]
        lineElem.style.fontFeatureSettings = "'basm'"
        //lineElem.textContent = lineText;
        /*
        lineElem.classList.add("linesuran")
        if (this.index === 0 || this.index === 1) {
          lineElem.style.paddingBottom = ((1.77 * 2) + 0.2) + "em"
        }
        const innerSpan = document.createElement('span');
        innerSpan.textContent = lineText;
        innerSpan.classList.add("innersura")
        lineElem.appendChild(innerSpan);*/
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

  applyTajweed(tajweedColor, lineElem: HTMLElement, lineIndex) {

    const lineText = this.quranText[this.index][lineIndex]

    if (!tajweedColor) {

      lineElem.textContent = lineText;
      return;
    }

    const result = this.tajweedService.applyTajweed(this.quranText, this.index, lineIndex)

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

    //div.removeChild(this.canvas);
    if (!currentZoomLayerNode) {
      if (this.canvas) {
        this.canvas.width = 0;
        this.canvas.height = 0;
        delete this.canvas;
      }
      this.resetZoomLayer();
    }

    /*
    this.loadingIconDiv = document.createElement('div');
    this.loadingIconDiv.className = 'loadingIcon';
    div.appendChild(this.loadingIconDiv);*/
  }

  update(viewport, isScalingRestricted, duringZoom: boolean = false) {
    this.viewport = viewport;

    if (this.canvas) {
      if ((this.hasRestrictedScaling && isScalingRestricted) || duringZoom) {
        this.canvas.style.width = this.viewport.width + 'px';
        this.canvas.style.height = this.viewport.height + 'px';
        this.div.style.width = this.viewport.width + 'px';
        this.div.style.height = this.viewport.height + 'px';
        return;
      }

      if (!this.zoomLayer && !this.canvas.hasAttribute('hidden')) {
        this.zoomLayer = this.canvas;
        this.zoomLayer.style.position = 'absolute';
      }
    }

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

  private getTextWidth(text, font) {
    // re-use canvas object for better performance
    const thisFunc = this.getTextWidth as any
    const canvas = thisFunc.canvas || (thisFunc.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);

    return metrics.width;
  }

  private getTextWidthDOM(text, font, fontFeatureSettings = null) {


    this.calculatewidthElem.style.font = font;
    this.calculatewidthElem.style.fontFeatureSettings = fontFeatureSettings;
    this.calculatewidthElem.innerHTML = text;

    var style = getComputedStyle(this.calculatewidthElem);

    return this.calculatewidthElem.clientWidth


  }

  private applyExpa(div, wordElements, desiredWidth, min, max, type) {
    for (let i = min; i <= max; i++) {
      for (const elem of wordElements) {

        var fontFeatureSettings = elem.style.fontFeatureSettings;
        if (!elem.style.fontFeatureSettings) {
          elem.style.fontFeatureSettings = `'${type}01'`;
        } else {
          elem.style.fontFeatureSettings = `${fontFeatureSettings},'${type}0${i}'`;
        }
        if (div.clientWidth > desiredWidth) {
          elem.style.fontFeatureSettings = fontFeatureSettings;
          return true
        }
      }
      return false
    }
  }

  private initElem(rootElem) {



    if (!rootElem) return;

    let div = document.createElement('div');

    div.style.width = 'fit-content';

    let nbSpaces = 0;
    let nbAyaSpaces = 0;
    let ayaSpaceElements = [];
    let spaceElements = [];
    let wordElements = [];

    if (rootElem.hasChildNodes()) {
      let children: any = Array.from(rootElem.childNodes);
      let lastWordElem = null;
      let lastSpaceElem = null;
      for (const node of children) {
        if (node.nodeType == Node.TEXT_NODE) {
          let currenText = "";
          const text = node.textContent
          for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            if (char === " ") {
              nbSpaces++;
              let className = "space"
              let ayaSpace = false
              if ((text.charCodeAt(i - 1) >= 0x0660 && text.charCodeAt(i - 1) <= 0x0669) || (text.charCodeAt(i + 1) === 0x06DD)) {
                nbAyaSpaces++;
                className = "ayaspace"
                ayaSpace = true
              }
              if (currenText) {
                if (!lastWordElem) {
                  lastWordElem = document.createElement('span');
                  lastWordElem.classList.add('word');
                  div.appendChild(lastWordElem);
                  wordElements.push(lastWordElem);
                }
                const textNode = document.createTextNode(currenText);
                lastWordElem.appendChild(textNode);
                currenText = "";
              }
              lastWordElem = null;

              lastSpaceElem = document.createElement('span');
              lastSpaceElem.classList.add(className);
              const textNode = document.createTextNode(char);
              lastSpaceElem.appendChild(textNode);
              div.appendChild(lastSpaceElem);
              spaceElements.push(lastSpaceElem)
              if (ayaSpace) {
                ayaSpaceElements.push(lastSpaceElem)
              }
            } else {
              currenText += char;
            }
          }
          if (currenText) {
            if (!lastWordElem) {
              lastWordElem = document.createElement('span');
              lastWordElem.classList.add('word');
              div.appendChild(lastWordElem);
              wordElements.push(lastWordElem);
            }
            const textNode = document.createTextNode(currenText);
            lastWordElem.appendChild(textNode);
            currenText = "";
          }
        } else {
          if (lastWordElem) {
            lastWordElem.appendChild(node);
          } else {
            lastWordElem = document.createElement('span');
            lastWordElem.classList.add('word');
            lastWordElem.appendChild(node);
            div.appendChild(lastWordElem);
            wordElements.push(lastWordElem);
          }
        }
      }
    }

    while (rootElem.firstChild) {
      rootElem.removeChild(rootElem.lastChild);
    }

    rootElem.appendChild(div);

    rootElem.nbSpaces = nbSpaces;
    rootElem.nbAyaSpaces = nbAyaSpaces;
    rootElem.ayaSpaceElements = ayaSpaceElements;
    rootElem.spaceElements = spaceElements;
    rootElem.wordElements = wordElements;


  }
  private getCanvasFont(el = document.body) {
    const fontWeight = this.getCssStyle(el, 'font-weight') || 'normal';
    const fontSize = this.getCssStyle(el, 'font-size') || '16px';
    const fontFamily = this.getCssStyle(el, 'font-family') || 'Times New Roman';

    return `${fontWeight} ${fontSize} ${fontFamily}`;
  }

  private async justifyElem(rootElem) {

    const desiredWidth = rootElem.clientWidth;

    const nbSpaces = rootElem.nbSpaces
    const nbAyaSpaces = rootElem.nbAyaSpaces
    const ayaSpaceElements = rootElem.ayaSpaceElements
    const spaceElements = rootElem.spaceElements
    const wordElements = rootElem.wordElements

    const div = rootElem.firstChild

    let text = rootElem.textContent;

    const rootStyle = getComputedStyle(rootElem)

    const fontSize = parseFloat(rootStyle.fontSize);

    let stretchBySpace = 0;
    let stretchByByAyaSpace = 0;
    const nbSimpleSpaces = (nbSpaces - nbAyaSpaces);

    if (nbSpaces && desiredWidth > div.clientWidth) {
      let maxStretchBySpace = this.spaceWidth * 0.5;
      let maxStretchByAyaSpace = this.spaceWidth * 2;

      let maxStretch = maxStretchBySpace * nbSimpleSpaces + maxStretchByAyaSpace * nbAyaSpaces;

      let stretch = Math.min(desiredWidth - div.clientWidth, maxStretch);
      let ratio = maxStretch != 0 ? stretch / maxStretch : 0;
      stretchBySpace = ratio * maxStretchBySpace;
      stretchByByAyaSpace = ratio * maxStretchByAyaSpace;
      rootElem.style.wordSpacing = stretchBySpace + "px"; // (stretchBySpace / fontSize) + "em";
      for (const elem of ayaSpaceElements) {
        elem.style.wordSpacing = stretchByByAyaSpace + "px"; // (stretchByByAyaSpace / fontSize) + "em";
      }
    }
    let stop = false;

    if (desiredWidth > div.clientWidth) {
      for (let i = 1; i <= 5 && !stop; i++) {
        stop = this.applyExpa(div, wordElements, desiredWidth, i, i, 'jt')
        if (!stop) {
          stop = this.applyExpa(div, wordElements, desiredWidth, i, i, 'dc')
        }
        if (!stop) {
          stop = this.applyExpa(div, wordElements, desiredWidth, i, i, 'kt')
        }

      }
      if (desiredWidth > div.clientWidth) {
        const underfull = desiredWidth - div.clientWidth;
        const addedStretch = nbSimpleSpaces !== 0 ? underfull / nbSimpleSpaces : 0;
        //rootElem.style.wordSpacing = ((addedStretch + stretchBySpace) / fontSize) + "em";
        rootElem.style.wordSpacing = (addedStretch + stretchBySpace) + "px";
      }
    } else {
      const ratio = desiredWidth / div.clientWidth;
      // TODO : add shrinking features to the font
      //shrink by changing font size for now 
      rootElem.style.fontSize = this.viewport.fontSize * ratio + "px";

    }




  }

  private getCssStyle(element, prop) {
    return window.getComputedStyle(element, null).getPropertyValue(prop);
  }
  private async applyJustification(line, apply) {

    this.deleteJustification(line);


    if (apply) {
      await this.justifyElem(line)
    }

  }

  private deleteJustification(line) {
    line.style.wordSpacing = null
    for (const elem of line.wordElements) {
      elem.style.fontFeatureSettings = null
    }
    for (const elem of line.ayaSpaceElements) {
      line.style.wordSpacing = null
    }
  }
}

export { PageView };
