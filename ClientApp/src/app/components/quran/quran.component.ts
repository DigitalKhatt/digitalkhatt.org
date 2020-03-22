import { Component, AfterViewInit, OnInit, HostListener, OnDestroy, ViewChildren, QueryList, ElementRef, ContentChild, ViewChild, NgZone, TemplateRef, Injectable } from '@angular/core';
import { QuranService } from '../../services/quranservice/quranservice.service';
import { DataSource, CollectionViewer } from '@angular/cdk/collections';
import { BehaviorSubject, Subscription, Observable, animationFrameScheduler, Subject } from 'rxjs';
import { CdkScrollable, ScrollDispatcher } from '../../services/scrolling';
import { startWith, auditTime, debounceTime, withLatestFrom, map } from 'rxjs/operators';
import { SidebarContentsService } from '../../services/navigation/sidebarcontents';
import { TemplatePortal } from '@angular/cdk/portal';
import { FormControl, Validators, FormGroup } from '@angular/forms';
//import { ScrollDispatcher, CdkScrollable } from '@angular/cdk/scrolling';

import { PageView } from './page_view';
import { RenderingQueue } from './rendering_queue';
import { QuranShaper } from '../../services/quranservice/quran_shaper';
import { BreakpointObserver } from '@angular/cdk/layout';
import { HammerGestureConfig, HAMMER_GESTURE_CONFIG, Title } from '@angular/platform-browser';

import * as Hammer from 'hammerjs';
import { CdkDrag } from '../../services/drag-drop';
import { Point, DragRef } from '../../services/drag-drop/drag-ref';
import { MatDialog } from '@angular/material/dialog';
import { AboutComponent } from '../about/about.component';
import { Router, NavigationEnd } from '@angular/router';
//import { CdkDrag } from '@angular/cdk/drag-drop';

const CSS_UNITS = 96.0 / 72.0;
const MIN_SCALE = 0.25;
const MAX_SCALE = 10.0;
const DEFAULT_SCALE_DELTA = 1.1;
const MAX_AUTO_SCALE = 1.25;



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
}

const DEFAULT_CACHE_SIZE = 10;

@Component({
  selector: 'app-quran-component',
  templateUrl: './quran.component.html',
  styleUrls: ['./quran.component.scss'],
  /*
  providers: [
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: QuranComponentHammerConfig
    }
  ],*/
})
export class QuranComponent implements OnInit, AfterViewInit, OnDestroy {

  private module: any;
  private quranShaper: any;
  private CSS_UNITS = 96.0 / 72.0;
  private sideBySideWidth = 992;
  private maxCanvasPixels = 16777216;



  hasFloatingToc: boolean = false;
  isOpened: boolean = false;



  scale;
  viewport;

  canvasWidth;
  canvasHeight;
  pages = [];
  scrollingSubscription: Subscription;
  itemSize;
  buffer: PDFPageViewBuffer = new PDFPageViewBuffer(DEFAULT_CACHE_SIZE);
  views: PageView[] = [];
  outline;

  pageSize = { width: 255, height: 410 };

  totalPages: number;
  maxPages: number;
  currentPageNumber;
  scrollState;
  texFormat: boolean;
  pageNumberBoxIsMoved: boolean;
  dragPosition;
  disableScroll: boolean = false;



  // @ViewChildren('canvas') canvas: QueryList<ElementRef>;
  @ViewChildren('page') pageElements: QueryList<ElementRef>;
  @ViewChild('testcanvas', { static: false }) testcanvasRef: ElementRef;
  @ViewChild(CdkDrag, { static: false }) pageNumberBoxRef: CdkDrag;

  @ViewChild(CdkScrollable, { static: false }) firstMyCustomDirective: CdkScrollable;

  @ViewChild('myPortal', { static: true }) myPortal: TemplatePortal<any>;
  @ViewChild('myReference', { static: true }) myReference: TemplateRef<any>;

  form: FormGroup;

  renderingQueue: RenderingQueue;
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
  loaded: boolean = false;
  fontScale: number = 1;

  wasmStatus;

  constrainPosition: (point: Point, dragRef: DragRef) => Point;

  hideElement: boolean = false;

  constructor(private quranService: QuranService,
    private sidebarContentsService: SidebarContentsService,
    public scrollDispatcher: ScrollDispatcher, private ngZone: NgZone,
    private elRef: ElementRef,
    private breakpointObserver: BreakpointObserver,
    private matDialog: MatDialog,
    private router: Router) {

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
    this.formatCtrl = new FormControl(1);
    this.tajweedColorCtrl = new FormControl(true);

    this.currentPageNumber = this.form.controls['currentPageNumber'].value;

    this.renderingQueue = new RenderingQueue();
    this.renderingQueue.setViewer(this);

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

    this.totalPages = 646;
    this.maxPages = 646;

    this.pages = new Array(this.maxPages);

    this.quranService.statusObserver.subscribe((status) => {
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

    this.itemSize = this.pageSize.height;

    this.pageNumberBoxIsMoved = false;

    this.dragPosition = { x: 0, y: 0 }

    let userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    let isAndroid = /Android/.test(userAgent);
    let isIOS = /\b(iPad|iPhone|iPod)(?=;)/.test(userAgent);

    if (isIOS || isAndroid) {
      this.maxCanvasPixels = 5242880;
    }

    this.constrainPosition = this.adjustPageNumBoxPosition.bind(this);

  }

  ngOnInit() {   
  }

  adjustPageNumBoxPosition(point: Point, dragRef: DragRef): Point {

    if (this.pageNumberBoxRef) {

      var box = this.pageNumberBoxRef.element.nativeElement;

      var pos: any = this.pageNumberBoxRef.getFreeDragPosition();
      console.log("Pos=", pos);

      var toolbarHeight = 48;

      var min = 60; //toolbarHeight + box.offsetHeight;

      if (point.y < min) {
        point.y = min;
      }

      var max = box.parentElement.clientHeight - box.offsetHeight + min;

      if (point.y > max) {
        point.y = max;
      }

    }
   
    return point;
  }


  ngAfterViewInit() {

    this.viewAreaElement = this.firstMyCustomDirective.getElementRef().nativeElement;

    this.setViewport(this.getScale(this.zoomCtrl.value), false);

    //this.loaded = true;

    this.quranService.promise.then((respone: QuranShaper) => {
      this.ngZone.runOutsideAngular(async () => {


        this.pageElements.forEach((page, index) => {
          this.views[index] = new PageView(page.nativeElement, index, this.quranService, this.viewport, this.renderingQueue);
        });

        this.quranShaper = respone; //respone.quranShaper;

        this.outline = respone.getOutline(true);

        this.isJustifiedCtrl.valueChanges.subscribe(value => {
          this.ngZone.runOutsideAngular(() => {
            respone.useJustification = value;
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
            //debounceTime(0, animationFrameScheduler)
          ).subscribe((data) => {
            if (!this.disableScroll) {
              this.scrollUpdated()
            } else {
              this.disableScroll = false;
            }

            

          });

        this.zoomCtrl.valueChanges.subscribe(value => {
          if (value !== 'custom') {
            this.setZoom(value);
          }          
        });

        this.formatCtrl.valueChanges.subscribe(value => {
          if (value == 1) {
            this.totalPages = 646;
            this.texFormat = true;
            this.fontScale = 1;
            this.quranService.quranShaper.setScalePoint(this.fontScale);
            this.outline = respone.getOutline(true);
          } else {
            this.totalPages = 604;
            this.texFormat = false;
            this.fontScale = 0.85;
            this.quranService.quranShaper.setScalePoint(this.fontScale);
            this.outline = respone.getOutline(false);
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
      var message = this.wasmStatus;
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
    this.quranService.quranShaper.setScalePoint(event.value);
    this.ngZone.runOutsideAngular(() => {
      this.buffer.reset();
      this.update();
    });
  }

  updatePageNumber(event) {
    let value = this.form.controls['currentPageNumber'].value;

    if (value < 1 || value > this.totalPages) {
      this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
    }
    else if (value !== this.currentPageNumber) {
      let offset = (value - 1) * this.itemSize;
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

    let offset = (pageNumber - 1) * this.itemSize;
    this.currentPageNumber = pageNumber;
    this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
    this.firstMyCustomDirective.scrollTo({ top: offset });

  }
  private setViewport(scale, updateView: boolean, duringZoom: boolean = false) {
    this.scale = scale;
    this.viewport = {
      width: Math.floor(this.pageSize.width * this.scale * CSS_UNITS),
      height: Math.floor(this.pageSize.height * this.scale * CSS_UNITS),
    }

    this.itemSize = this.viewport.height + 2;

    this.updateWidth(updateView, duringZoom);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    //if (this.container) {
    //    this.container.innerHTML = '';
    //    this.drawCanvas();
    //}

    let width = event.target.innerWidth;

    this.isSideBySide = width >= this.sideBySideWidth;

    this.movePageNumberBox();

    this.ngZone.runOutsideAngular(() => {
      this.updateWidth(true);
      this.update();
    });


  }

  update() {
    /*
    function wait(ms) {
      let start = Date.now(),
        now = start;
      while (now - start < ms) {
        now = Date.now();
      }
    }*/

    

    const visible = this._getVisiblePages();
    const visiblePages = visible.views, numVisiblePages = visiblePages.length;

    if (numVisiblePages === 0) {
      return;
    }


    const newCacheSize = Math.max(DEFAULT_CACHE_SIZE, 2 * numVisiblePages + 1);
    this.buffer.resize(newCacheSize, visiblePages);

    /*
    console.log('scroll2')

    wait(10000)

    console.log('end wait')*/

    this.renderingQueue.renderHighestPriority(visible);
    
    if (visible.views && visible.views.length) {
      this.ngZone.run(() => {
        this.currentPageNumber = visible.views[0].id;
        this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
        this.visibleViews = visible;
        this.loaded = true;
      });
    }


  }

  /*
  update_old() {

    var scrollOffset = this.firstMyCustomDirective.measureScrollOffset('top');
    const firstVisibleIndex = Math.floor(scrollOffset / this.itemSize);
    let lastVisibleIndex = Math.floor((scrollOffset + this.firstMyCustomDirective.getElementRef().nativeElement.clientHeight) / this.itemSize);
    let promise = Promise.resolve();
    lastVisibleIndex = Math.min(this.pages.length - 1, lastVisibleIndex);

    let numVisiblePages = lastVisibleIndex - firstVisibleIndex + 1;

    const newCacheSize = Math.max(DEFAULT_CACHE_SIZE, 2 * numVisiblePages + 1);

    let visiblePages = [];
    for (let currIndex = firstVisibleIndex; currIndex <= lastVisibleIndex; currIndex++) {
      visiblePages.push(this.views[currIndex]);
    }
    this.buffer.resize(newCacheSize, visiblePages);

    for (let currIndex = firstVisibleIndex; currIndex <= lastVisibleIndex; currIndex++) {

      let view = this.views[currIndex];
      this.buffer.push(view);
      promise = promise.then(() => view.draw(this.canvasWidth, this.canvasHeight, this.texFormat));

    }

    this.ngZone.run(() => {
      this.currentPageNumber = firstVisibleIndex + 1;
      this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
    });
  }*/

  updateWidth(updateView: boolean, duringZoom: boolean = false) {
    var ctx = this.testcanvasRef.nativeElement.getContext('2d', { alpha: true, });

    let outputScale = this.quranService.getOutputScale(ctx);

    this.viewport.hasRestrictedScaling = false;

    if (this.maxCanvasPixels > 0) {

      let pixelsInViewport = this.viewport.width * this.viewport.height;
      let maxScale = Math.sqrt(this.maxCanvasPixels / pixelsInViewport);
      if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
        outputScale.sx = maxScale;
        outputScale.sy = maxScale;
        outputScale.scaled = true;
        this.viewport.hasRestrictedScaling = true;
      } 
    }

    //let sfx = this.approximateFraction(outputScale.sx);
    //let sfy = this.approximateFraction(outputScale.sy);

    let canvasWidth = Math.round(this.viewport.width * outputScale.sx); // this.roundToDivide(this.viewport.width * outputScale.sx, sfx[0]);
    let canvasHeight = Math.round(this.viewport.height * outputScale.sy); //this.roundToDivide(this.viewport.height * outputScale.sy, sfy[0]);

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
    let offset = outline.pageNumber * this.itemSize + outline.y * this.scale * CSS_UNITS;
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

      this.firstMyCustomDirective.scrollTo({ top: ytop, start: xstart});
      

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

    this.zoomCtrl.setValue('custom');

    this.setScale(newScale);

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

    let oldScale = this.scale;



    //let pageIndex = this.currentPageNumber - 1;

    let pageIndex = (this.visibleViews.first.id - 1) || 0;

    var element = this.views[pageIndex].div;

    const top = this.firstMyCustomDirective.measureScrollOffset('top'), bottom = top + this.viewAreaElement.clientHeight;
    const left = this.firstMyCustomDirective.measureScrollOffset('start'), right = left + this.viewAreaElement.clientWidth;

    /*
    const currentWidth = element.offsetLeft + element.clientLeft;
    const currentHeight = element.offsetTop + element.clientTop;
    const viewWidth = element.clientWidth, viewHeight = element.clientHeight;
    const viewRight = currentWidth + viewWidth;
    const viewBottom = currentHeight + viewHeight;

    const hiddenHeight = Math.max(0, top - currentHeight) +    Math.max(0, viewBottom - bottom);
    const hiddenWidth = Math.max(0, left - currentWidth) + Math.max(0, viewRight - right);*/

    let offset = ((Math.max(0, top - element.offsetTop) / oldScale) * newScale); // + 1;



    this.ngZone.runOutsideAngular(() => {

      this.setViewport(newScale, true);

      this.firstMyCustomDirective.scrollTo({ top: pageIndex * this.itemSize + offset });

      this.update();
    });
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

    this.zoomCtrl.setValue('custom');

    this.setScale(newScale);
  }

  forceRendering(currentlyVisiblePages) {
    let visiblePages = currentlyVisiblePages || this._getVisiblePages();



    let scrollAhead = (this._isScrollModeHorizontal ? this.scrollState.right : this.scrollState.down);
    let pageView = this.renderingQueue.getHighestPriority(visiblePages,
      this.views,
      scrollAhead, this.totalPages);
    if (pageView) {      
      //Promise.resolve().then(() => {
        this.buffer.push(pageView);
        this.renderingQueue.renderView(pageView,
          this.canvasWidth, this.canvasHeight,
          this.texFormat,
          this.tajweedColorCtrl.value,
          this.viewport.hasRestrictedScaling);
      //})
      
      
      return true;
    }
    return false;
  }

  _getVisiblePages() {

    let scrollEl = this.firstMyCustomDirective.getElementRef().nativeElement;

    let top = this.firstMyCustomDirective.measureScrollOffset('top')
    if (top < 0) top = 0;
    const bottom = top + scrollEl.clientHeight;
    const left = this.firstMyCustomDirective.measureScrollOffset('start'), right = left + scrollEl.clientWidth;

    const firstVisibleIndex = Math.floor(top / this.itemSize);

    let lastVisibleIndex = Math.floor(bottom / this.itemSize);

    lastVisibleIndex = Math.min(this.totalPages - 1, lastVisibleIndex);
    //lastVisibleIndex = firstVisibleIndex + 1;

    let visible = [];
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
      let pc = a.percent - b.percent;
      if (Math.abs(pc) > 0.001) {
        return -pc;
      }
      return a.id - b.id; // ensure stability
    });


    return { first, last, views: visible, };
  }

  updateHostClasses() {

  }

  getScale(value) {

    let container = this.elRef.nativeElement;

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
      let pageWidthScale = (container.clientWidth) / (this.pageSize.width * CSS_UNITS);
      let pageHeightScale = (container.clientHeight - vPadding) / (this.pageSize.height * CSS_UNITS);

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
        /*
        case 'auto':
          // For pages in landscape mode, fit the page height to the viewer
          // *unless* the page would thus become too wide to fit horizontally.
          let horizontalScale = pageWidthScale;
          scale = Math.min(MAX_AUTO_SCALE, horizontalScale);
          break;*/
        default:
          return 1;
      }
    }

    return scale;
  }

  setZoom(value) {

    let scale = this.getScale(value);

    this.setScale(scale);

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

    var offset = this.firstMyCustomDirective.measureScrollOffset('top');

    if (this.viewAreaElement.scrollHeight) {
      var perc = offset / (this.viewAreaElement.scrollHeight);

      var box = this.pageNumberBoxRef.element.nativeElement;

      var top = Math.floor((box.parentElement.clientHeight - box.offsetHeight) * perc);

      this.dragPosition = { x: 0, y: top };
    }

  }

  private scrollUpdated() {

    let currentX = this.viewAreaElement.scrollLeft;
    let lastX = this.scrollState.lastX;
    if (currentX !== lastX) {
      this.scrollState.right = currentX > lastX;
    }
    this.scrollState.lastX = currentX;
    let currentY = this.viewAreaElement.scrollTop;
    let lastY = this.scrollState.lastY;
    if (currentY !== lastY) {
      this.scrollState.down = currentY > lastY;
    }
    this.scrollState.lastY = currentY;

    if (!this.pageNumberBoxIsMoved) {
      this.movePageNumberBox();
    } else {
      this.pageNumberBoxIsMoved = false;
    }

    this.ngZone.runOutsideAngular(() => {
      this.update();
    });
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
      data: { }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');      
    });

  }
  /*
  @HostListener('window:reload')
  doSomething() {
    debugger;
  }*/



}

