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

 * You should have received a copy of the GNU Affero General Public License
 * along with DigitalKhatt. If not, see
 * <https: //www.gnu.org/licenses />.
*/

import { RenderingStates } from './rendering_states';
import { QuranShaper } from '../../services/quranservice/quran_shaper';

class PageView {
  renderingState: RenderingStates;
  quranShaper: QuranShaper;
  quranShaperPromise;
  private viewport;
  private canvas;
  private loadingIconDiv;
  private paintTask;
  id;
  resume;

  public renderingId;
  zoomLayer;
  hasRestrictedScaling;

  constructor(public div, private index, private quranService, viewport, private renderingQueue) {
    this.renderingState = RenderingStates.INITIAL;


    this.id = index + 1;
    this.renderingId = 'page' + this.id;

    this.viewport = viewport;

    //this.viewport.width = 400;
    //this.viewport.height = Math.floor(Math.floor(1.61803398875 * this.viewport.width));

    this.div.style.width = Math.floor(this.viewport.width) + 'px';
    this.div.style.height = Math.floor(this.viewport.height) + 'px';
    this.paintTask = null;
    this.resume = null;

    /*
    this.loadingIconDiv = document.createElement('div');
    this.loadingIconDiv.className = 'loadingIcon';
    div.appendChild(this.loadingIconDiv);*/

    this.zoomLayer = null;

    this.hasRestrictedScaling = false;


  }

  async draw(canvasWidth, canvasHeight, texFormat, tajweedColor, hasRestrictedScaling) {


    if (this.renderingState !== RenderingStates.INITIAL) {
      return Promise.resolve();
    }

    const div = this.div;

    this.renderingState = RenderingStates.RUNNING;

    const childNodes = div.childNodes;

    for (let i = childNodes.length - 1; i >= 0; i--) {
      const node = childNodes[i];

      node.style.display = "flex";
    }

    this.renderingState = RenderingStates.FINISHED;

    return Promise.resolve();



  }

  reset(keepZoomLayer = false) {

    const div = this.div;
    div.style.width = Math.floor(this.viewport.width) + 'px';
    div.style.height = Math.floor(this.viewport.height) + 'px';

    if (this.paintTask) {
      this.paintTask.cancel();
      this.paintTask = null;
      //console.log("Task " + this.index + " Cancelled");
    }

    this.resume = null;

    this.renderingState = RenderingStates.INITIAL;
    //let ctx = this.canvas.getContext('2d');
    //ctx.setTransform(1, 0, 0, 1, 0, 0);
    //ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    div.removeAttribute('data-loaded');


    const childNodes = div.childNodes;
    const currentZoomLayerNode = (keepZoomLayer && this.zoomLayer) || null;


    for (let i = childNodes.length - 1; i >= 0; i--) {
      const node = childNodes[i];
      //if (currentZoomLayerNode === node) {
      //  continue;
      //}
      //div.removeChild(node);
      node.style.display = "none";
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

}

export { PageView };
