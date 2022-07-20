/*
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

import { Component, AfterViewInit, OnInit, HostListener, OnDestroy, ViewChildren, QueryList, ElementRef, ViewChild, NgZone, TemplateRef, ChangeDetectorRef } from '@angular/core';

import { Subscription, animationFrameScheduler } from 'rxjs';

import { startWith, auditTime, debounceTime } from 'rxjs/operators';

import { TemplatePortal } from '@angular/cdk/portal';
import { FormControl, Validators, FormGroup } from '@angular/forms';

import { PageView } from './page_view';
import { BreakpointObserver } from '@angular/cdk/layout';

//import * as Hammer from 'hammerjs';

import { MatDialog } from '@angular/material/dialog';
import { AboutComponent } from '../about/about.component';
import { Router, NavigationEnd } from '@angular/router';
import { CdkDrag, DragRef, Point } from '@angular/cdk/drag-drop';
import { CdkScrollable, ScrollDispatcher } from '@angular/cdk/scrolling';
import { LayoutService } from '../../services/layoutservice/layoutservice.service';
import { RenderingStates } from './rendering_states';



const MIN_SCALE = 0.25;
const MAX_SCALE = 10.0;
const DEFAULT_SCALE_DELTA = 1.1;



class PDFPageViewBuffer {

  private data = [];
  constructor(private size) {
  }

  push(view) {
    let i = this.data.indexOf(view);
    if (i >= 0) {
      this.data.splice(i, 1);
    }
    this.data.push(view);
    if (this.data.length > this.size) {
      this.data.shift().destroy();
    }
  };
  resize(newSize, pagesToKeep) {
    this.size = newSize;
    if (pagesToKeep) {
      const pageIdsToKeep = new Set();
      for (let i = 0, iMax = pagesToKeep.length; i < iMax; ++i) {
        pageIdsToKeep.add(pagesToKeep[i].id);
      }
      this.moveToEndOfArray(this.data, function (page) {
        return pageIdsToKeep.has(page.id);
      });
    }
    while (this.data.length > this.size) {
      this.data.shift().destroy();
    }
  };

  reset() {
    while (this.data.length > 0) {
      this.data.shift().destroy();
    }
  }

  private moveToEndOfArray(arr, condition) {
    const moved = [], len = arr.length;
    let write = 0;
    for (let read = 0; read < len; ++read) {
      if (condition(arr[read])) {
        moved.push(arr[read]);
      } else {
        arr[write] = arr[read];
        ++write;
      }
    }
    for (let read = 0; write < len; ++read, ++write) {
      arr[write] = moved[read];
    }
  }

  toggleLoadingIconSpinner(visibleIds) {
    for (const pageView of this.data) {
      if (visibleIds.has(pageView.id)) {
        continue;
      }
      pageView.toggleLoadingIconSpinner(/* viewVisible = */ false);
    }
  }
}

const DEFAULT_CACHE_SIZE = 20;

@Component({
  selector: 'app-qurancanvas-component',
  templateUrl: './qurancanvas.component.html',
  styleUrls: ['./qurancanvas.component.scss'],
  /*
  providers: [
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: QuranComponentHammerConfig
    }
  ],*/
})
export class QuranCanvasComponent implements OnInit, AfterViewInit, OnDestroy {



  private CSS_UNITS = 96.0 / 72.0;
  private sideBySideWidth = 992;
  private maxCanvasPixels = 16777216;
  private totalPageTex = 651;
  private totalPageMadina = 604;



  hasFloatingToc = false;
  isOpened = false;



  scale;
  customScale;
  viewport;

  canvasWidth;
  canvasHeight;
  pages = [];
  scrollingSubscription: Subscription;
  itemSize;
  buffer: PDFPageViewBuffer = new PDFPageViewBuffer(DEFAULT_CACHE_SIZE);
  views: PageView[] = [];
  outline;



  totalPages: number;
  maxPages: number;
  currentPageNumber;
  scrollState;
  texFormat: boolean;
  pageNumberBoxIsMoved: boolean;
  dragPosition;
  disableScroll = false;
  highestPriorityPage;



  // @ViewChildren('canvas') canvas: QueryList<ElementRef>;
  @ViewChildren('page') pageElements: QueryList<ElementRef>;
  @ViewChild('testcanvas', { static: false }) testcanvasRef: ElementRef;
  @ViewChild(CdkDrag, { static: false }) pageNumberBoxRef: CdkDrag;

  @ViewChild('viewerContainer', { static: false, read: CdkScrollable }) firstMyCustomDirective: CdkScrollable;

  @ViewChild('myPortal', { static: true }) myPortal: TemplatePortal<any>;
  @ViewChild('myReference', { static: true }) myReference: TemplateRef<any>;

  form: FormGroup;

  viewAreaElement: HTMLElement;
  private _isScrollModeHorizontal = false;


  isSideBySide: boolean;

  get mode() { return this.isSideBySide ? 'side' : 'over'; }

  zooms;
  zoomCtrl: FormControl;
  formatCtrl: FormControl;
  isJustifiedCtrl: FormControl;
  tajweedColorCtrl: FormControl;
  visibleViews;
  loaded = false;
  fontScale = 1;

  wasmStatus;

  constrainPosition: (point: Point, dragRef: DragRef) => Point;

  hideElement = false;

  quranData: any = {};

  threadedScrolling = true;

  constructor(public scrollDispatcher: ScrollDispatcher, private ngZone: NgZone,
    private elRef: ElementRef,
    private breakpointObserver: BreakpointObserver,
    private matDialog: MatDialog,
    private router: Router,
    private layoutService: LayoutService,
    private cdr: ChangeDetectorRef) {

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        if (event.url.includes('about')) {
          this.hideElement = true;
        } else {
          this.hideElement = false;
        }
      }
    });

    this.isSideBySide = breakpointObserver.isMatched('(min-width: ' + this.sideBySideWidth + 'px)');

    this.currentPageNumber = new FormControl(1, [
      Validators.required
    ]);

    this.form = new FormGroup({
      currentPageNumber: this.currentPageNumber,
    });

    this.isJustifiedCtrl = new FormControl(true);
    this.zoomCtrl = new FormControl('page-fit');
    this.formatCtrl = new FormControl(2);
    this.tajweedColorCtrl = new FormControl(true);

    this.currentPageNumber = this.form.controls['currentPageNumber'].value;

    this.zooms = [
      {
        value: '0.5'
      },
      {
        value: '0.75'
      },
      {
        value: '1'
      },
      {
        value: '1.25'
      },
      {
        value: '1.5'
      },
      {
        value: '2'
      },
      {
        value: '3'
      },
      {
        value: '4'
      }
    ]

    this.texFormat = true;

    this.totalPages = this.totalPageMadina;
    this.maxPages = this.totalPages;

    this.pages = new Array(this.maxPages);

    this.layoutService.statusObserver.subscribe((status) => {
      this.wasmStatus = status.message + " ...";
      if (status.error) {
        console.log("Error : " + JSON.stringify(status.error));
      }
    })

    window.onerror = (msg, url, lineNo, columnNo, error) => {
      console.log("Error occured: " + msg + error.stack);
      this.wasmStatus = "Error";
      return false;
    }

    this.itemSize = LayoutService.pageHeight;

    this.pageNumberBoxIsMoved = false;

    this.dragPosition = { x: 0, y: 0 }

    const userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const isAndroid = /Android/.test(userAgent);
    const isIOS = /\b(iPad|iPhone|iPod)(?=;)/.test(userAgent);

    if (isIOS || isAndroid) {
      this.maxCanvasPixels = 5242880;
    }

    this.constrainPosition = this.adjustPageNumBoxPosition.bind(this);

  }

  ngOnInit() {
  }

  adjustPageNumBoxPosition(point: Point, dragRef: DragRef): Point {

    if (this.pageNumberBoxRef) {

      const box = this.pageNumberBoxRef.element.nativeElement;

      const min = 60; //toolbarHeight + box.offsetHeight;

      if (point.y < min) {
        point.y = min;
      }

      const max = box.parentElement.clientHeight - box.offsetHeight + min;

      if (point.y > max) {
        point.y = max;
      }

    }

    return point;
  }


  ngAfterViewInit() {

    this.viewAreaElement = this.firstMyCustomDirective.getElementRef().nativeElement;

    this.viewAreaElement.focus();

    this.setViewport(this.getScale(this.zoomCtrl.value), false);

    this.layoutService.promise.then(result => {
      this.quranData = result;
    })
      .catch(error => {
        console.error(error)
      });

    this.layoutService.promise.then(() => {
      this.ngZone.runOutsideAngular(async () => {


        this.pageElements.forEach((page, index) => {
          this.views[index] = new PageView(page.nativeElement, index, this.layoutService, this.viewport, this);
        });



        this.outline = this.layoutService.getOutline(true);

        this.isJustifiedCtrl.valueChanges.subscribe(value => {
          this.ngZone.runOutsideAngular(() => {
            //respone.useJustification = value;
            this.buffer.reset();
            this.update();
          });
        });

        this.scrollState = {
          right: true,
          down: true,
          lastX: this.viewAreaElement.scrollLeft,
          lastY: this.viewAreaElement.scrollTop
        };


        this.scrollingSubscription = this.firstMyCustomDirective.elementScrolled()
          .pipe(
            // Start off with a fake scroll event so we properly detect our initial position.
            startWith(null!),
            // Collect multiple events into one until the next animation frame. This way if
            // there are multiple scroll events in the same frame we only need to recheck
            // our layout once.           
            auditTime(0, animationFrameScheduler),
            //debounceTime(50, animationFrameScheduler)
          ).subscribe((data) => {
            this.ngZone.runOutsideAngular(() => {
              if (!this.disableScroll) {
                this.scrollUpdated()
              } else {
                this.disableScroll = false;
              }
            });

          });

        this.zoomCtrl.valueChanges.subscribe(value => {
          if (value !== 'custom') {
            this.setScale(this.getScale(value))
          } else {
            this.setScale(this.customScale)
          }
        });

        this.formatCtrl.valueChanges.subscribe(value => {
          if (value == 1) {
            this.totalPages = this.totalPageTex;
            this.texFormat = true;
            this.fontScale = 1;
            //this.quranService.quranShaper.setScalePoint(this.fontScale);
            this.outline = this.layoutService.getOutline(true);
          } else {
            this.totalPages = 604;
            this.texFormat = false;
            this.fontScale = 0.80;
            //this.quranService.quranShaper.setScalePoint(this.fontScale);
            this.outline = this.layoutService.getOutline(false);
          }

          this.ngZone.runOutsideAngular(() => {
            this.buffer.reset();
            this.update();
          });
        });

        this.tajweedColorCtrl.valueChanges.subscribe(value => {

          this.ngZone.runOutsideAngular(() => {
            this.buffer.reset();
            this.update();
          });
        });

        const layoutChanges = this.breakpointObserver.observe([
          '(orientation: portrait)',
          '(orientation: landscape)',
          '(hover: none)',
        ]);

        layoutChanges.subscribe(result => {
          if (result.breakpoints['(hover: none)']) {
            if (result.breakpoints['(orientation: portrait)']) {
              this.zoomCtrl.setValue('page-width');
            } else {
              this.zoomCtrl.setValue('page-width');
            }
          } else {
            this.zoomCtrl.setValue('page-fit');
          }

        });

        //let scroll = this.watchScroll(this.viewAreaElement, this.scrollUpdated.bind(this));

      });


    }).catch((error) => {
      this.wasmStatus = "Error during compilation. Cannot proceede"
      const message = this.wasmStatus;
      if (error && error.message) {
        this.wasmStatus = "Error during compilation. Cannot proceede." + error.message;
      }
      console.log(message, error);
    });

  }

  formatLabel(value: number) {

    return Math.round(value * 100) + '%';
  }

  fontScaleChanged(event) {
    /*
    this.quranService.quranShaper.setScalePoint(event.value);
    this.ngZone.runOutsideAngular(() => {
      this.buffer.reset();
      this.update();
    });*/
  }

  updatePageNumber(event) {
    const value = this.form.controls['currentPageNumber'].value;

    if (value < 1 || value > this.totalPages) {
      this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
    }
    else if (value !== this.currentPageNumber) {
      const offset = (value - 1) * this.itemSize;
      this.currentPageNumber = value;
      this.firstMyCustomDirective.scrollTo({ top: offset });
    }
  }
  ngOnDestroy() {
    this.scrollingSubscription.unsubscribe();
  }

  navigateTo(page) {
    if (page === 'first') {
      this.setPage(1);
    } else if (page === 'prev') {
      this.setPage(this.currentPageNumber - 1);
    } else if (page === 'next') {
      this.setPage(this.currentPageNumber + 1);
    } else if (page === 'last') {
      this.setPage(this.totalPages);
    }
  }

  setPage(pageNumber) {

    const offset = (pageNumber - 1) * this.itemSize;
    this.currentPageNumber = pageNumber;
    this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
    this.firstMyCustomDirective.scrollTo({ top: offset });

  }

  private setViewport(scale, updateView: boolean, duringZoom = false) {

    this.scale = scale;

    this.viewport = {
      width: Math.floor(LayoutService.pageWidth * this.scale * LayoutService.CSS_UNITS),
      height: Math.floor(LayoutService.pageHeight * this.scale * LayoutService.CSS_UNITS),
    }

    this.itemSize = this.viewport.height + 2;

    this.updateWidth(updateView, duringZoom);

  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {

    const width = event.target.innerWidth;

    this.isSideBySide = width >= this.sideBySideWidth;

    this.movePageNumberBox();

    this.ngZone.runOutsideAngular(() => {
      this.updateWidth(true);
      this.update();
    });


  }

  update() {

    const visible = this._getVisiblePages();
    const visiblePages = visible.views
    const numVisiblePages = visiblePages.length;

    if (numVisiblePages === 0) {
      return;
    }

    const newCacheSize = Math.max(DEFAULT_CACHE_SIZE, 2 * numVisiblePages + 1);
    this.buffer.resize(newCacheSize, visiblePages);

    this.forceRendering(visible);

    if (visible.views && visible.views.length) {
      this.ngZone.run(() => {
        this.currentPageNumber = visible.views[0].id;
        this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
        this.visibleViews = visible;
        this.loaded = true;
      });
    }


  }

  renderView(view: PageView, canvasWidth, canvasHeight, texFormat, tajweedColor, hasRestrictedScaling) {
    switch (view.renderingState) {
      case RenderingStates.FINISHED:
        return false;
      case RenderingStates.PAUSED:
        this.highestPriorityPage = view.renderingId;
        view.resume();
        break;
      case RenderingStates.RUNNING:
        this.highestPriorityPage = view.renderingId;
        break;
      case RenderingStates.INITIAL:
        this.highestPriorityPage = view.renderingId;
        view.draw(canvasWidth, canvasHeight, texFormat, hasRestrictedScaling).finally(() => {
          //console.log(`Finish draw page ${view.id} with state ${view.renderingState}`);
          this.update()
        });
        break;
    }
    return true;
  }

  isHighestPriority(view) {
    return this.highestPriorityPage === view.renderingId;
  }

  updateWidth(updateView: boolean, duringZoom = false) {
    const ctx = this.testcanvasRef.nativeElement.getContext('2d', { alpha: true, });

    const outputScale = this.layoutService.getOutputScale(ctx);

    this.viewport.hasRestrictedScaling = false;

    if (this.maxCanvasPixels > 0) {

      const pixelsInViewport = this.viewport.width * this.viewport.height;
      const maxScale = Math.sqrt(this.maxCanvasPixels / pixelsInViewport);
      if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
        outputScale.sx = maxScale;
        outputScale.sy = maxScale;
        outputScale.scaled = true;
        this.viewport.hasRestrictedScaling = true;
      }
    }

    //let sfx = this.approximateFraction(outputScale.sx);
    //let sfy = this.approximateFraction(outputScale.sy);

    const canvasWidth = Math.round(this.viewport.width * outputScale.sx); // this.roundToDivide(this.viewport.width * outputScale.sx, sfx[0]);
    const canvasHeight = Math.round(this.viewport.height * outputScale.sy); //this.roundToDivide(this.viewport.height * outputScale.sy, sfy[0]);

    //if (canvasWidth !== this.canvasWidth || canvasHeight !== this.canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    if (updateView) {
      this.views.forEach(a => a.update(this.viewport, this.viewport.hasRestrictedScaling, duringZoom));
    }
    //}
  }

  setOutline(outline) {
    //let offset = outline.dest[0].num * this.itemSize + (this.pageSize.height - outline.dest[3]) * this.scale * CSS_UNITS;
    const offset = outline.pageNumber * this.itemSize + outline.y * this.scale * LayoutService.CSS_UNITS;
    this.currentPageNumber = outline.pageNumber + 1;
    this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);

    this.firstMyCustomDirective.scrollTo({ top: offset });
  }



  approximateFraction(x) {
    // Fast paths for int numbers or their inversions.
    if (Math.floor(x) === x) {
      return [x, 1];
    }
    let xinv = 1 / x;
    let limit = 8;
    if (xinv > limit) {
      return [1, limit];
    }
    else if (Math.floor(xinv) === xinv) {
      return [1, xinv];
    }
    let x_ = x > 1 ? xinv : x;
    // a/b and c/d are neighbours in Farey sequence.
    let a = 0, b = 1, c = 1, d = 1;
    // Limiting search to order 8.
    while (true) {
      // Generating next term in sequence (order of q).
      let p = a + c, q = b + d;
      if (q > limit) {
        break;
      }
      if (x_ <= p / q) {
        c = p;
        d = q;
      }
      else {
        a = p;
        b = q;
      }
    }
    let result;
    // Select closest of the neighbours to x.
    if (x_ - a / b < c / d - x_) {
      result = x_ === x ? [a, b] : [b, a];
    }
    else {
      result = x_ === x ? [c, d] : [d, c];
    }
    return result;
  }
  roundToDivide(x, div) {
    let r = x % div;
    return r === 0 ? x : Math.round(x - r + div);
  }

  zoom(event) {

    let newScale;

    newScale = this.scale;

    newScale = (newScale * event.scale).toFixed(3);
    newScale = Math.ceil(newScale * 1000) / 1000;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    let oldScale = this.scale;

    let pageIndex = (this.visibleViews.first.id - 1) || 0;

    var element = this.views[pageIndex].div;

    var displY = event.clientY - 48;
    var displX = event.clientX;

    const top = this.firstMyCustomDirective.measureScrollOffset('top'), bottom = top + this.viewAreaElement.clientHeight;
    const start = this.firstMyCustomDirective.measureScrollOffset('start'), right = start + this.viewAreaElement.clientWidth;

    //this.zoomCtrl.setValue('custom');
    this.ngZone.runOutsideAngular(() => {

      var nbpagesY = (top + displY) / this.itemSize;
      var nbpagesX = (start + displX) / this.viewport.width;

      this.disableScroll = true;
      this.setViewport(newScale, true, true);

      var ytop = nbpagesY * this.itemSize - displY;
      var xstart = nbpagesX * this.viewport.width - displX;

      this.firstMyCustomDirective.scrollTo({ top: ytop, start: xstart });


    });


  }

  endzoom(event) {

    this.ngZone.runOutsideAngular(() => {

      this.views.forEach(a => a.update(this.viewport, this.viewport.hasRestrictedScaling, false));

      this.update();
    });
  }

  zoomIn() {

    let newScale = this.scale;

    newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
    newScale = Math.ceil(newScale * 10) / 10;
    newScale = Math.min(MAX_SCALE, newScale);

    this.customScale = newScale;

    this.zoomCtrl.setValue('custom');

  }
  //@HostListener('keydown.control')
  @HostListener('document:keydown.control.+', ['$event'])
  @HostListener('document:keydown.control.=', ['$event'])
  zout(event: KeyboardEvent) {
    this.zoomIn();
    event.preventDefault();

  }

  setScale(newScale) {

    if (!this.visibleViews) {
      this.setViewport(newScale, true);
      return;
    }

    const oldScale = this.scale;

    const pageIndex = (this.visibleViews.first.id - 1) || 0;

    const element = this.views[pageIndex].div;

    const top = this.firstMyCustomDirective.measureScrollOffset('top') //bottom = top + this.viewAreaElement.clientHeight;
    //const left = this.firstMyCustomDirective.measureScrollOffset('start') //right = left + this.viewAreaElement.clientWidth;   

    const offset = ((Math.max(0, top - element.offsetTop) / oldScale) * newScale); // + 1;

    this.ngZone.runOutsideAngular(() => {

      this.setViewport(newScale, true);

      this.firstMyCustomDirective.scrollTo({ top: pageIndex * this.itemSize + offset });

      this.update();
    });

    this.cdr.detectChanges()
  }

  @HostListener('document:keydown.control.-', ['$event'])
  zin(event: KeyboardEvent) {
    this.zoomOut();
    event.preventDefault();
  }
  zoomOut() {

    let newScale = this.scale;

    newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
    newScale = Math.floor(newScale * 10) / 10;
    newScale = Math.max(MIN_SCALE, newScale);

    this.customScale = newScale;

    this.zoomCtrl.setValue('custom');
  }

  forceRendering(currentlyVisiblePages) {
    const visiblePages = currentlyVisiblePages || this._getVisiblePages();



    const scrollAhead = (this._isScrollModeHorizontal ? this.scrollState.right : this.scrollState.down);
    const pageView = this.getHighestPriority(visiblePages,
      this.views,
      scrollAhead, this.totalPages);

    this.toggleLoadingIconSpinner(visiblePages);

    if (pageView) {
      this.buffer.push(pageView);
      this.renderView(pageView,
        this.canvasWidth, this.canvasHeight,
        this.texFormat,
        this.tajweedColorCtrl.value,
        this.viewport.hasRestrictedScaling);
      return true;
    }
    return false;
  }

  toggleLoadingIconSpinner(visiblePages) {
    const visibleIds = new Set()
    for (const visisbleView of visiblePages.views) {
      const pageView = visisbleView.view;
      pageView?.toggleLoadingIconSpinner(/* viewVisible = */ true);
      visibleIds.add(visisbleView.id)
    }

    this.buffer.toggleLoadingIconSpinner(visibleIds);

  }

  _getVisiblePages() {

    const scrollEl = this.firstMyCustomDirective.getElementRef().nativeElement;

    let top = this.firstMyCustomDirective.measureScrollOffset('top')
    if (top < 0) top = 0;
    const bottom = top + scrollEl.clientHeight;
    const left = this.firstMyCustomDirective.measureScrollOffset('start')
    const right = left + scrollEl.clientWidth;

    const firstVisibleIndex = Math.floor(top / this.itemSize);

    let lastVisibleIndex = Math.floor(bottom / this.itemSize);

    lastVisibleIndex = Math.min(this.totalPages - 1, lastVisibleIndex);
    //lastVisibleIndex = firstVisibleIndex + 1;

    const visible = [];
    for (let currIndex = firstVisibleIndex; currIndex <= lastVisibleIndex; currIndex++) {
      const view = this.views[currIndex], element = view.div;
      const currentWidth = element.offsetLeft + element.clientLeft;
      const currentHeight = element.offsetTop + element.clientTop;
      const viewWidth = element.clientWidth, viewHeight = element.clientHeight;
      const viewRight = currentWidth + viewWidth;
      const viewBottom = currentHeight + viewHeight;

      const hiddenHeight = Math.max(0, top - currentHeight) +
        Math.max(0, viewBottom - bottom);
      const hiddenWidth = Math.max(0, left - currentWidth) +
        Math.max(0, viewRight - right);
      const percent = ((viewHeight - hiddenHeight) * (viewWidth - hiddenWidth) *
        100 / viewHeight / viewWidth) | 0;

      visible.push({
        id: view.id,
        x: currentWidth,
        y: currentHeight,
        view,
        percent,
      });
    }

    const first = visible[0], last = visible[visible.length - 1];

    visible.sort(function (a, b) {
      const pc = a.percent - b.percent;
      if (Math.abs(pc) > 0.001) {
        return -pc;
      }
      return a.id - b.id; // ensure stability
    });


    return { first, last, views: visible, };
  }
  isViewFinished(view) {
    return view.renderingState === RenderingStates.FINISHED;
  }
  getHighestPriority(visible, views, scrolledDown, totalPages) {
    /**
     * The state has changed. Figure out which page has the highest priority to
     * render next (if any).
     *
     * Priority:
     * 1. visible pages
     * 2. if last scrolled down, the page after the visible pages, or
     *    if last scrolled up, the page before the visible pages
     */
    const visibleViews = visible.views;

    const numVisible = visibleViews.length;
    if (numVisible === 0) {
      return null;
    }
    for (let i = 0; i < numVisible; ++i) {
      const view = visibleViews[i].view;
      if (!this.isViewFinished(view)) {
        return view;
      }
    }

    // All the visible views have rendered; try to render next/previous pages.
    if (scrolledDown) {
      const nextPageIndex = visible.last.id;
      // IDs start at 1, so no need to add 1.
      if (views[nextPageIndex] && !this.isViewFinished(views[nextPageIndex]) && nextPageIndex < totalPages) {
        return views[nextPageIndex];
      }
    } else {
      const previousPageIndex = visible.first.id - 2;
      if (views[previousPageIndex] &&
        !this.isViewFinished(views[previousPageIndex])) {
        return views[previousPageIndex];
      }
    }
    // Everything that needs to be rendered has been.
    return null;
  }

  updateHostClasses() {

  }

  getScale(value) {

    const container = this.elRef.nativeElement;

    let scale = parseFloat(value);
    if (scale > 0) {
      return scale;
    } else {

      const SCROLLBAR_PADDING = 6;
      const VERTICAL_PADDING = 0;

      const noPadding = false;

      let hPadding = noPadding ? 0 : SCROLLBAR_PADDING;
      let vPadding = noPadding ? 0 : VERTICAL_PADDING;

      if (!noPadding && this._isScrollModeHorizontal) {
        [hPadding, vPadding] = [vPadding, hPadding]; // Swap the padding values.
      }
      const pageWidthScale = (container.clientWidth) / (LayoutService.pageWidth * LayoutService.CSS_UNITS);
      const pageHeightScale = (container.clientHeight - vPadding) / (LayoutService.pageHeight * LayoutService.CSS_UNITS);

      switch (value) {
        case 'page-actual':
          scale = 1;
          break;
        case 'page-width':
          scale = pageWidthScale;
          break;
        case 'page-height':
          scale = pageHeightScale;
          break;
        case 'page-fit':
          scale = Math.min(pageWidthScale, pageHeightScale);
          break;
        case 'custom':
          scale = this.scale;
          break;
        default:
          return 1;
      }
    }

    return scale;
  }

  toggleFullScreen() {
    let doc = window.document as any;
    var docEl = this.viewAreaElement as any;

    var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (requestFullScreen && !doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      requestFullScreen.call(docEl);
    } else if (cancelFullScreen) {
      cancelFullScreen.call(doc);
    }
  }

  pageNumberBoxMoved(event) {

    var box = this.pageNumberBoxRef.element.nativeElement;

    var pos: any = this.pageNumberBoxRef.getFreeDragPosition();

    //var height = this.viewAreaElement.clientHeight - box.offsetHeight;
    var height = box.parentElement.clientHeight - box.offsetHeight;

    var oldoffset = this.firstMyCustomDirective.measureScrollOffset('top');

    if ((pos.y === 0 && oldoffset === 0)
      || (pos.y === height && (oldoffset + this.viewAreaElement.clientHeight) === this.viewAreaElement.scrollHeight))
      return;

    var offset = Math.floor(pos.y / height * this.viewAreaElement.scrollHeight);

    this.pageNumberBoxIsMoved = true;
    this.firstMyCustomDirective.scrollTo({ top: offset });



  }

  movePageNumberBox() {

    const offset = this.firstMyCustomDirective.measureScrollOffset('top');

    if (this.viewAreaElement.scrollHeight) {
      const perc = offset / (this.viewAreaElement.scrollHeight);

      const box = this.pageNumberBoxRef.element.nativeElement;

      const top = Math.floor((box.parentElement.clientHeight - box.offsetHeight) * perc);

      this.dragPosition = { x: 0, y: top };
    }

  }

  private scrollUpdated() {

    const currentX = this.viewAreaElement.scrollLeft;
    const lastX = this.scrollState.lastX;
    if (currentX !== lastX) {
      this.scrollState.right = currentX > lastX;
    }
    this.scrollState.lastX = currentX;
    const currentY = this.viewAreaElement.scrollTop;
    const lastY = this.scrollState.lastY;
    if (currentY !== lastY) {
      this.scrollState.down = currentY > lastY;
    }
    this.scrollState.lastY = currentY;

    if (!this.pageNumberBoxIsMoved) {
      this.movePageNumberBox();
    } else {
      this.pageNumberBoxIsMoved = false;
    }

    this.update();
  }

  watchScroll(viewAreaElement, callback) {
    let debounceScroll = function (evt) {

      if (rAF) {
        return;
      }
      // schedule an invocation of scroll for next animation frame.
      rAF = window.requestAnimationFrame(function viewAreaElementScrolled() {
        rAF = null;

        let currentX = viewAreaElement.scrollLeft;
        let lastX = state.lastX;
        if (currentX !== lastX) {
          state.right = currentX > lastX;
        }
        state.lastX = currentX;
        let currentY = viewAreaElement.scrollTop;
        let lastY = state.lastY;
        if (currentY !== lastY) {
          state.down = currentY > lastY;
        }
        state.lastY = currentY;
        callback(state);
      });
    };

    let state = {
      right: true,
      down: true,
      lastX: viewAreaElement.scrollLeft,
      lastY: viewAreaElement.scrollTop,
      _eventHandler: debounceScroll,
    };

    let rAF = null;
    viewAreaElement.addEventListener('scroll', debounceScroll, { capture: true, passive: true });
    return state;
  }

  openAbout() {
    const dialogRef = this.matDialog.open(AboutComponent, {
      height: '98%',
      width: '100vw',
      panelClass: 'full-screen-modal',
      data: {}
    });

    dialogRef.afterClosed().subscribe(() => {
      console.log('The dialog was closed');
    });

  }
}

