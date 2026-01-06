
import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, QueryList, TemplateRef, ViewChild, ViewChildren, Inject } from '@angular/core';
import { Subscription, animationFrameScheduler } from 'rxjs';

import { TemplatePortal } from '@angular/cdk/portal';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { auditTime, startWith } from 'rxjs/operators';
import { SidebarContentsService } from '../../services/navigation/sidebarcontents';

import { BreakpointObserver } from '@angular/cdk/layout';

import { CdkDrag, DragRef, Point } from '@angular/cdk/drag-drop';
import { CdkScrollable, ScrollDispatcher } from '@angular/cdk/scrolling';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AboutComponent } from '../about/about.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  loadAndCacheFont,
  loadHarfbuzz,
  RenderingStates,
  PageViewBuffer,
  DEFAULT_CACHE_SIZE,
  CSSPageRenderer,
  PageViewer,
  JustStyleEnum,
  MushafLayoutTypeEnum,
  type PageFormat,
  type PageViewerRenderOptions,
  type CSSWordClickInfo,
} from "@digitalkhatt/quran-engine"
import { MushafLayoutType, NewMadinahQuranTextService, OldMadinahQuranTextService, QuranTextIndopak15Service, QuranTextService, MUSHAFLAYOUTTYPE } from '../../services/qurantext.service';
import { VerseMappingService, VerseRef, WordClickInfo, VerseClickInfo, HighlightGroup, isAyahMarker } from '../../services/verse-mapping.service';
import { TajweedService } from '../../services/tajweed.service';
import { saveAs } from 'file-saver-es';
import { commonModules } from '../../app.config';


const MIN_SCALE = 0.25;
const MAX_SCALE = 10.0;
const DEFAULT_SCALE_DELTA = 1.1;

@Component({
  selector: 'app-otfmushaf-component',
  templateUrl: './otfmushaf.component.html',
  styleUrls: ['./otfmushaf.component.scss'],
  host: {
    '[class.oldmadina]': 'mushafType == MushafLayoutTypeEnum.OldMadinah',
    '[class.newmadina]': 'mushafType == MushafLayoutTypeEnum.NewMadinah',
    '[class.indopak]': 'mushafType == MushafLayoutTypeEnum.IndoPak15Lines'
  },
  providers: [TajweedService],
  imports: [...commonModules, RouterOutlet, RouterLink]
})
export class OTFMushafComponent implements OnInit, AfterViewInit, OnDestroy {

  MushafLayoutTypeEnum = MushafLayoutType;

  private sideBySideWidth = 992;
  mushafType: MushafLayoutType = MushafLayoutType.NewMadinah;

  fontFamily;


  fontsize;
  highestPriorityPage: PageViewer | null = null;

  hasFloatingToc: boolean = false;
  isOpened: boolean = false;
  private quranTextService: QuranTextService

  // CSS page renderer from quran-engine
  private cssPageRenderer: CSSPageRenderer | null = null;

  scale;
  viewport: PageFormat;

  canvasWidth: number;
  canvasHeight: number;
  pages = [];
  scrollingSubscription: Subscription;
  itemSize;
  buffer: PageViewBuffer<PageViewer> = new PageViewBuffer<PageViewer>(DEFAULT_CACHE_SIZE);
  views: PageViewer[] = [];
  outline: any = [];

  static DEFAULT_SCALE = 15 / 1000
  static DEFAULT_PAGE_SIZE = { width: 255, height: 410, marginWidth: OTFMushafComponent.DEFAULT_SCALE * 400 };
  static DFAULT_FONT_SIZE = OTFMushafComponent.DEFAULT_PAGE_SIZE.width / (17000 / 1000);

  pageSize = OTFMushafComponent.DEFAULT_PAGE_SIZE
  defaultFontSize: number;

  totalPages: number;
  maxPages: number;
  currentPageNumber;
  scrollState;
  texFormat: boolean;
  pageNumberBoxIsMoved: boolean;
  dragPosition;
  disableScroll: boolean = false;
  debug = false;

  @ViewChildren('page') pageElements: QueryList<ElementRef>;
  @ViewChild('testcanvas', { static: false }) testcanvasRef: ElementRef;
  @ViewChild('calculatewidthElem', { static: false }) calculatewidthElem: ElementRef;
  @ViewChild('lineJustify', { static: false }) lineJustify: ElementRef;
  @ViewChild(CdkDrag, { static: false }) pageNumberBoxRef: CdkDrag;

  //@ViewChild(CdkScrollable, { static: false }) firstMyCustomDirective: CdkScrollable;
  @ViewChild('viewerContainer', { static: false, read: CdkScrollable }) firstMyCustomDirective: CdkScrollable;

  @ViewChild('myPortal', { static: true }) myPortal: TemplatePortal<any>;
  @ViewChild('myReference', { static: true }) myReference: TemplateRef<any>;

  form: UntypedFormGroup;


  viewAreaElement: HTMLElement;
  private _isScrollModeHorizontal = false;


  isSideBySide: boolean;

  get mode() { return this.isSideBySide ? 'side' : 'over'; }

  zooms;
  zoomCtrl: UntypedFormControl;
  isJustifiedCtrl: UntypedFormControl;
  tajweedColorCtrl: UntypedFormControl;
  fontScaleCtrl: UntypedFormControl;
  fontScale = 0.75;
  visibleViews;
  loaded: boolean = false;


  wasmStatus;

  constrainPosition: (point: Point, dragRef: DragRef) => Point;

  hideElement: boolean = false;

  // Word click and highlight support
  enableWordClick: boolean = true;
  highlightGroups: HighlightGroup[] = [];

  constructor(@Inject(MUSHAFLAYOUTTYPE) mushafLayoutType: MushafLayoutType,
    private sidebarContentsService: SidebarContentsService,
    public scrollDispatcher: ScrollDispatcher, private ngZone: NgZone,
    private elRef: ElementRef,
    private breakpointObserver: BreakpointObserver,
    private matDialog: MatDialog,
    private router: Router,
    private tajweedService: TajweedService,
    private _snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private verseMappingService: VerseMappingService,
  ) {

    this.debug = this.route.snapshot.queryParams.debug !== undefined;


    switch (mushafLayoutType) {
      case MushafLayoutType.OldMadinah:
        this.mushafType = MushafLayoutType.OldMadinah;
        this.quranTextService = OldMadinahQuranTextService;
        this.defaultFontSize = OTFMushafComponent.DEFAULT_PAGE_SIZE.width / (16400  / 1000);
        this.fontFamily = "ctoldmadina" 
        break;
      case MushafLayoutType.IndoPak15Lines:
        this.mushafType = MushafLayoutType.IndoPak15Lines;
        this.quranTextService = QuranTextIndopak15Service;
        this.defaultFontSize = OTFMushafComponent.DEFAULT_PAGE_SIZE.width / (16400 / 1000);
        this.fontFamily = "ctindopak" 
        break;
      default:
        this.mushafType = MushafLayoutType.NewMadinah;
        this.quranTextService = NewMadinahQuranTextService;
        this.defaultFontSize = OTFMushafComponent.DEFAULT_PAGE_SIZE.width / (16200 / 1000);
        this.fontFamily = "ctmadina" 
        break;
    }


    let nbav = window as any;

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

    const lastPageNumber = parseInt(localStorage.getItem("lastPageNumber")) || 1;

    const currentPageNumber = new UntypedFormControl(lastPageNumber, [
      Validators.required
    ]);

    this.form = new UntypedFormGroup({
      currentPageNumber: currentPageNumber,
    });

    this.isJustifiedCtrl = new UntypedFormControl(true);
    this.zoomCtrl = new UntypedFormControl('page-fit');
    this.tajweedColorCtrl = new UntypedFormControl(false);
    this.fontScaleCtrl = new UntypedFormControl(this.fontScale)

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

    this.totalPages = this.quranTextService.nbPages;
    this.maxPages = this.totalPages;

    this.pages = new Array(this.maxPages);

    window.onerror = (msg, url, lineNo, columnNo, error) => {
      console.log("Error occured: " + msg + error.stack);
      this.wasmStatus = "Error";
      return false;
    }

    this.itemSize = this.pageSize.height;

    this.pageNumberBoxIsMoved = false;

    this.dragPosition = { x: 0, y: 0 }


    this.constrainPosition = this.adjustPageNumBoxPosition.bind(this);

    this.fontsize = this.defaultFontSize;

  }

  ngOnInit() {

  }

  ngAfterViewInit() {

    this.viewAreaElement = this.firstMyCustomDirective.getElementRef().nativeElement;

    //this.loaded = true;
    setTimeout(() => {

      this.ngZone.runOutsideAngular(async () => {

        await loadHarfbuzz("assets/hb.wasm")

        if (this.mushafType === MushafLayoutType.OldMadinah) {
          await loadAndCacheFont("oldmadina", "assets/fonts/hb/oldmadina.otf")
        } else if (this.mushafType === MushafLayoutType.NewMadinah) {
          await loadAndCacheFont("oldmadina", "assets/fonts/hb/madina.otf")
        } else {
          await loadAndCacheFont("oldmadina", "assets/fonts/hb/indopak.otf")
        }

        document.fonts.load("12px oldmadina").then(() => {

          this.setViewport(this.getScale(this.zoomCtrl.value), false);

          // Create CSSPageRenderer from quran-engine
          // Map Angular MushafLayoutType to quran-engine MushafLayoutTypeEnum
          const engineMushafType = this.mushafType === MushafLayoutType.OldMadinah ? MushafLayoutTypeEnum.OldMadinah
            : this.mushafType === MushafLayoutType.IndoPak15Lines ? MushafLayoutTypeEnum.IndoPak15Lines
            : MushafLayoutTypeEnum.NewMadinah;

          this.cssPageRenderer = new CSSPageRenderer({
            textService: this.quranTextService,
            mushafType: engineMushafType,
          });

          // Create PageViewer instances for each page
          this.pageElements.forEach((page, index) => {
            this.views[index] = new PageViewer({
              pageIndex: index,
              container: page.nativeElement,
              viewport: this.viewport,
              renderer: this.cssPageRenderer!,
              rendererType: 'css',
              lineJustifyElement: this.lineJustify.nativeElement,
            });
          });

          this.scrollState = {
            right: true,
            down: true,
            lastX: this.viewAreaElement.scrollLeft,
            lastY: this.viewAreaElement.scrollTop
          };

          this.setPage(this.currentPageNumber);


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

          this.outline = this.quranTextService.outline;

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

          /*
          this.fontScaleCtrl.valueChanges.subscribe(value => {
            this.fontScale = this.fontScaleCtrl.value;
            this.ngZone.runOutsideAngular(() => {
              this.setViewport(this.scale, false, false);
              this.buffer.reset();
              this.updateWidth(false);
              this.update();
            });
          });*/

        })

      });
    });
  }
  fontSizeChanged() {
    this.fontScale = this.fontScaleCtrl.value;
    this.ngZone.runOutsideAngular(() => {
      this.setViewport(this.scale, false, false);
      this.buffer.reset();
      this.updateWidth(false);
      this.update();
    });
  }
  adjustPageNumBoxPosition(point: Point, dragRef: DragRef): Point {

    if (this.pageNumberBoxRef) {

      var box = this.pageNumberBoxRef.element.nativeElement;

      var pos: any = this.pageNumberBoxRef.getFreeDragPosition();


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

  formatLabel(value: number) {

    return Math.round(value * 100) + '%';
  }


  updatePageNumber(event) {
    let value = this.form.controls['currentPageNumber'].value;

    if (value < 1 || value > this.totalPages) {
      this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
    }
    else if (value !== this.currentPageNumber) {

      this.setPage(value)
    }
  }
  ngOnDestroy() {
    this.scrollingSubscription?.unsubscribe();
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
    localStorage.setItem("lastPageNumber", this.currentPageNumber);
    this.firstMyCustomDirective.scrollTo({ top: offset });

  }
  private setViewport(scale, updateView: boolean, duringZoom: boolean = false) {
    const borderWidth = 2;
    this.scale = scale;
    this.fontsize = this.defaultFontSize * scale * this.fontScale /* this.fontScaleCtrl.value*/
    this.viewport = {
      width: Math.floor(this.pageSize.width * this.scale),
      height: Math.floor(this.pageSize.height * this.scale + borderWidth),
      fontSize: this.fontsize
    }

    this.itemSize = this.viewport.height

    if (updateView) {
      this.updateWidth(duringZoom);
    }

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
      this.updateWidth(false);
      this.update();
    });


  }

  update() {

    const visible = this._getVisiblePages();
    const visiblePages = visible.views, numVisiblePages = visiblePages.length;

    if (numVisiblePages === 0) {
      return;
    }

    const newCacheSize = Math.max(DEFAULT_CACHE_SIZE, 2 * numVisiblePages + 1);
    this.buffer.resize(newCacheSize, visiblePages);

    this.forceRendering(visible)

    if (visible.views && visible.views.length) {
      this.ngZone.run(() => {
        this.currentPageNumber = visible.views[0].id;
        this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
        this.visibleViews = visible;
        this.loaded = true;
      });
    }


  }

  updateWidth(duringZoom: boolean) {
    this.views.forEach(a => a.update(this.viewport, duringZoom));
  }

  setOutline(outline) {

    const paddingTop = 0.2 * this.viewport.fontSize;
    const lineHeight = 1.77;
    const y = paddingTop + 1.77 * this.viewport.fontSize * outline.lineIndex;

    let offset = outline.pageIndex * this.itemSize + y;
    this.currentPageNumber = outline.pageIndex + 1;
    this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);

    this.firstMyCustomDirective.scrollTo({ top: offset });
  }

  zoom(event) {

    let newScale;

    newScale = this.scale;

    newScale = (newScale * event.scale).toFixed(3);
    newScale = Math.ceil(newScale * 1000) / 1000;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    let oldScale = this.scale;

    let pageIndex = (this.visibleViews.first.id - 1) || 0;

    var element = this.views[pageIndex].container;

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

      this.views.forEach(a => a.update(this.viewport, false));

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

    var element = this.views[pageIndex].container;

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

  isViewFinished(view) {
    return view.renderingState === RenderingStates.FINISHED;
  }

  getHighestPriority(visible, views, scrolledDown, totalPages) {

    let visibleViews = visible.views;

    let numVisible = visibleViews.length;
    if (numVisible === 0) {
      return null;
    }
    for (let i = 0; i < numVisible; ++i) {
      let view = visibleViews[i].view;
      if (!this.isViewFinished(view)) {
        return view;
      }
    }

    // All the visible views have rendered; try to render next/previous pages.
    if (scrolledDown) {
      let nextPageIndex = visible.last.id;
      // IDs start at 1, so no need to add 1.
      if (views[nextPageIndex] && !this.isViewFinished(views[nextPageIndex]) && nextPageIndex < totalPages) {
        return views[nextPageIndex];
      }
    } else {
      let previousPageIndex = visible.first.id - 2;
      if (views[previousPageIndex] &&
        !this.isViewFinished(views[previousPageIndex])) {
        return views[previousPageIndex];
      }
    }
    // Everything that needs to be rendered has been.
    return null;
  }

  forceRendering(currentlyVisiblePages) {
    let visiblePages = currentlyVisiblePages || this._getVisiblePages();

    let scrollAhead = (this._isScrollModeHorizontal ? this.scrollState.right : this.scrollState.down);
    let pageView = this.getHighestPriority(visiblePages, this.views, scrollAhead, this.totalPages);
    if (pageView) {
      this.buffer.push(pageView);
      this.renderView(pageView, this.tajweedColorCtrl.value);
      return true;
    }
    return false;
  }

  renderView(view: PageViewer, tajweedColor: boolean) {
    const oldHigh = this.highestPriorityPage;
    switch (view.renderingState) {
      case RenderingStates.FINISHED:
        return false;
      case RenderingStates.PAUSED:
        this.highestPriorityPage = view;
        view.resume();
        break;
      case RenderingStates.RUNNING:
        this.highestPriorityPage = view;
        break;
      case RenderingStates.INITIAL:
        this.highestPriorityPage = view;

        const renderOptions: PageViewerRenderOptions = {
          tajweedEnabled: tajweedColor,
          verseNumberFormat: 'arabic',
          justStyle: JustStyleEnum.XScale,
          applyTajweed: (pageIndex: number) => this.tajweedService.applyTajweedByPage(this.quranTextService, pageIndex),
          enableWordClick: this.enableWordClick,
          onWordClick: this.enableWordClick ? (info: CSSWordClickInfo) => {
            console.log('CSSPageRenderer onWordClick fired:', info);
            this.handleWordClick(info);
          } : undefined,
        };
        console.log('Rendering page with enableWordClick:', this.enableWordClick);

        view.draw(renderOptions)
          .catch(error => {
            console.log(error)
          })
          .finally(() => {
            this.forceRendering(null)
          });
        break;
    }
    if (oldHigh != null && oldHigh != this.highestPriorityPage) {
      oldHigh.pause()
    }
    return true;
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
      const view = this.views[currIndex], element = view.container;
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
      const VERTICAL_PADDING = 48 // task bar height;

      const noPadding = false;

      let hPadding = noPadding ? 0 : SCROLLBAR_PADDING;
      let vPadding = noPadding ? 0 : VERTICAL_PADDING;

      if (!noPadding && this._isScrollModeHorizontal) {
        [hPadding, vPadding] = [vPadding, hPadding]; // Swap the padding values.
      }
      let pageWidthScale = (container.clientWidth) / (this.pageSize.width);
      let pageHeightScale = (container.clientHeight - vPadding) / (this.pageSize.height);

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
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });

  }

  replacer(key: any, value: any) {
    if (value instanceof Map) {
      const result: { [key: number]: string } = {};
      for (let [key, keyValue] of value) {
        result[key] = keyValue;
      }
      return result;
    } else {
      return value;
    }
  }

  saveTajweed() {

    const result = {
      quranText: {},
      tajweedResult: {}
    };

    type MushafLayoutTypeStrings = keyof typeof MushafLayoutType;

    const keys: MushafLayoutTypeStrings[] = Object.keys(MushafLayoutType) as MushafLayoutTypeStrings[];

    for (let mushafTypeName in MushafLayoutType) {
      if (isNaN(Number(mushafTypeName))) {
        const tajweedData = this.getTajweedData(mushafTypeName);


        result.quranText[mushafTypeName] = tajweedData.quranText;
        result.tajweedResult[mushafTypeName] = tajweedData.tajweedResult;
      }
    }






    const json = JSON.stringify(result, this.replacer, 2);

    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    saveAs(blob, `tajweed_data.json`);
  }



  getTajweedData(mushafTypeName: string) {

    let textService: QuranTextService;

    const mushafType = MushafLayoutType[mushafTypeName];

    switch (mushafType) {
      case MushafLayoutType.OldMadinah:
        textService = OldMadinahQuranTextService;
        break;
      case MushafLayoutType.IndoPak15Lines:
        textService = QuranTextIndopak15Service;
        break;
      default:
        textService = NewMadinahQuranTextService;
        break;
    }

    const quranText = textService.quranText;

    const tajweedResult = new Map();

    for (let pageIndex = 0; pageIndex < quranText.length; pageIndex++) {
      const lineTajweed = this.tajweedService.applyTajweedByPage(textService, pageIndex);
      tajweedResult.set(pageIndex + 1, lineTajweed);
    }

    return {
      quranText,
      tajweedResult
    };

  }
  navigateToMushaf(layoutIndex) {
    if (layoutIndex === 3) {
      this.router.navigate(['/hb/indopak15'])
    }

  }

  // ============================================
  // Word Click and Highlight Methods
  // ============================================

  /**
   * Handle word click from CSSPageRenderer
   */
  handleWordClick(info: CSSWordClickInfo): void {
    // Get verse reference for clicked word
    const verseRef = this.verseMappingService.getVerseForWord(
      this.quranTextService,
      info.pageIndex,
      info.lineIndex,
      info.wordIndex
    );

    // Build word click info
    const wordClickInfo: WordClickInfo = {
      pageNumber: info.pageIndex + 1,
      lineIndex: info.lineIndex,
      wordIndex: info.wordIndex,
      text: info.text,
      surah: verseRef?.surah,
      ayah: verseRef?.ayah,
    };

    // Run in Angular zone for change detection
    this.ngZone.run(() => {
      console.log('Word clicked:', wordClickInfo);

      // Check if clicked word is an ayah marker
      if (isAyahMarker(info.text)) {
        // Highlight entire verse for ayah marker clicks
        if (verseRef) {
          this.highlightVerse(verseRef.surah, verseRef.ayah);
        }
      } else {
        // Highlight just this word for regular word clicks
        this.highlightWord(info.pageIndex, info.lineIndex, info.wordIndex);
      }

      // Emit word click event
      this.onWordClick(wordClickInfo);
    });
  }

  /**
   * Called when a word is clicked
   * Override this method or use @Output to handle word clicks
   */
  onWordClick(info: WordClickInfo): void {
    // Default implementation - can be overridden or connected to @Output
    console.log(`Word clicked: Page ${info.pageNumber}, Line ${info.lineIndex}, Word ${info.wordIndex}`);
    if (info.surah && info.ayah) {
      console.log(`Verse: Surah ${info.surah}, Ayah ${info.ayah}`);
    }
  }

  /**
   * Called when a verse is clicked
   * Override this method or use @Output to handle verse clicks
   */
  onVerseClick(info: VerseClickInfo): void {
    // Default implementation - can be overridden or connected to @Output
    console.log(`Verse clicked: Surah ${info.surah}, Ayah ${info.ayah}`);

    // Example: Highlight the clicked verse
    this.highlightVerse(info.surah, info.ayah);
  }

  /**
   * Highlight a specific verse
   */
  highlightVerse(surah: number, ayah: number, color: string = 'rgba(255, 255, 0, 0.3)'): void {
    // Get all word positions for this verse
    const words = this.verseMappingService.getWordsForVerse(
      this.quranTextService,
      surah,
      ayah
    );

    // Update highlight groups
    this.highlightGroups = [{
      verses: [{ surah, ayah }],
      words: words,
      color,
    }];

    // Apply highlights to visible pages
    this.applyHighlightsToVisiblePages();
  }

  /**
   * Highlight a single word
   */
  highlightWord(pageIndex: number, lineIndex: number, wordIndex: number, color: string = 'rgba(255, 255, 0, 0.3)'): void {
    // Update highlight groups with just this word
    this.highlightGroups = [{
      words: [{ page: pageIndex, line: lineIndex, word: wordIndex }],
      color,
    }];

    // Apply highlights to visible pages
    this.applyHighlightsToVisiblePages();
  }

  /**
   * Highlight multiple verses
   */
  highlightVerses(verses: Array<{ surah: number; ayah: number }>, color: string = 'rgba(255, 255, 0, 0.3)'): void {
    // Get all word positions for these verses
    const words = this.verseMappingService.getWordsForVerses(
      this.quranTextService,
      verses
    );

    // Update highlight groups
    this.highlightGroups = [{
      verses,
      words,
      color,
    }];

    // Apply highlights to visible pages
    this.applyHighlightsToVisiblePages();
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    this.highlightGroups = [];
    this.applyHighlightsToVisiblePages();
  }

  /**
   * Apply highlights to all visible pages
   */
  private applyHighlightsToVisiblePages(): void {
    if (!this.cssPageRenderer) return;

    // Get visible pages
    const visible = this._getVisiblePages();
    if (!visible.views) return;

    for (const viewInfo of visible.views) {
      const view = viewInfo.view as PageViewer;
      const wordElements = view.getWordElements();
      if (wordElements) {
        // Convert highlight groups to page-specific format
        const pageHighlights = this.highlightGroups.map(group => ({
          words: group.words?.filter(w => w.page === view.pageIndex) || [],
          color: group.color,
        }));

        this.cssPageRenderer.applyHighlights(wordElements, pageHighlights, view.pageIndex);
      }
    }
  }
}

