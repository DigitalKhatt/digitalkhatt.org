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
import { LayoutService } from '../../services/layoutservice/layoutservice.service';
import { QuranCanvasComponent } from './qurancanvas.component';

class PageView {
  renderingState: RenderingStates;
  private viewport;
  private canvas: HTMLCanvasElement;  
  private loadingIconDiv;
  private paintTask;
  id;
  resume;

  public renderingId;
  zoomLayer;
  hasRestrictedScaling;

  constructor(public div, private index, private layoutService: LayoutService, viewport, private renderingQueue: QuranCanvasComponent) {
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

  async draw(canvasWidth, canvasHeight, texFormat, hasRestrictedScaling) {

    //console.log(`draw page ${this.id} state ${this.renderingState}`);

    if (this.renderingState !== RenderingStates.INITIAL) {
      this.reset();
      return Promise.resolve();
    }

    // Keep the canvas hidden until the first draw callback, or until drawing
    // is complete when `!this.renderingQueue`, to prevent black flickering.
    //canvas.setAttribute('hidden', 'hidden');
    let isCanvasHidden = true;
    const showCanvas = () => {
      if (isCanvasHidden) {
        this.canvas.hidden = false;
        isCanvasHidden = false;
      }
    };

    const token = {
      cancelled: false,
      isCancelled: function () { return this.cancelled },
      cancel: function () {
        this.cancelled = true;
        if (this.task) {
          this.task.cancel();
        }
        this.task = null;
      },
      pause: () => {
        return !this.renderingQueue.isHighestPriority(this);
      },
      onContinue: (cont) => {
        showCanvas()
        if (!this.renderingQueue.isHighestPriority(this)) {
          this.renderingState = RenderingStates.PAUSED;
          this.resume = () => {
            this.renderingState = RenderingStates.RUNNING;
            cont();
          };
          return;
        }
        cont();
      }
    };

    if (this.paintTask) {
      this.paintTask.cancel();
    }

    this.paintTask = token;

    const canvas = document.createElement('canvas');
    canvas.hidden = true;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = this.viewport.width + 'px';
    canvas.style.height = this.viewport.height + 'px';

    this.canvas = canvas;
    this.div.appendChild(this.canvas);

    this.div.setAttribute('data-loaded', true);

    this.renderingState = RenderingStates.RUNNING;   

    const ctx = (this.canvas.getContext('2d') as CanvasRenderingContext2D);

    const scale = canvasWidth / LayoutService.pageWidth;
    ctx.transform(scale, 0, 0, -scale, 0, canvasHeight);

    this.hasRestrictedScaling = hasRestrictedScaling;

    await this.layoutService.printPage(this.index, ctx, token, texFormat);

    if (!token.isCancelled() && this.renderingState === RenderingStates.RUNNING) {

      this.renderingState = RenderingStates.FINISHED;

      showCanvas();
      if (this.loadingIconDiv) {
        this.div.removeChild(this.loadingIconDiv);
        delete this.loadingIconDiv;
      }
      this.resetZoomLayer(/* removeFromDOM = */ true);
    }

    if (token === this.paintTask) {
      this.paintTask = null;
    }


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


    div.removeAttribute('data-loaded');


    const childNodes = div.childNodes;
    const currentZoomLayerNode = (keepZoomLayer && this.zoomLayer) || null;

    for (let i = childNodes.length - 1; i >= 0; i--) {
      const node = childNodes[i];
      if (currentZoomLayerNode === node) {
        continue;
      }
      div.removeChild(node);
    }

    if (!currentZoomLayerNode) {
      if (this.canvas) {
        this.canvas.width = 0;
        this.canvas.height = 0;
        delete this.canvas;
      }
      this.resetZoomLayer();
    }

    this.loadingIconDiv = document.createElement("div");
    this.loadingIconDiv.className = "loadingIcon notVisible";
    div.append(this.loadingIconDiv);

  }

  toggleLoadingIconSpinner(viewVisible = false) {
    this.loadingIconDiv?.classList.toggle("notVisible", !viewVisible);
  }

  update(viewport, isScalingRestricted, duringZoom = false) {
    this.viewport = viewport;

    if (this.canvas) {
      if ((this.hasRestrictedScaling && isScalingRestricted) || duringZoom) {
        this.canvas.style.width = this.viewport.width + 'px';
        this.canvas.style.height = this.viewport.height + 'px';
        this.div.style.width = this.viewport.width + 'px';
        this.div.style.height = this.viewport.height + 'px';
        return;
      }

      if (!this.zoomLayer && !this.canvas.hidden) {
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
    const zoomLayerCanvas = this.zoomLayer; //.firstChild;
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
