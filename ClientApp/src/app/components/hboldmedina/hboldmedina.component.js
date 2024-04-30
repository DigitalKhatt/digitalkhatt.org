"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HBOldMedinaComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var forms_1 = require("@angular/forms");
var operators_1 = require("rxjs/operators");
var page_view_1 = require("./page_view");
//import * as Hammer from 'hammerjs';
var drag_drop_1 = require("@angular/cdk/drag-drop");
var scrolling_1 = require("@angular/cdk/scrolling");
var router_1 = require("@angular/router");
var about_component_1 = require("../about/about.component");
var rendering_states_1 = require("./rendering_states");
var harfbuzz_1 = require("./harfbuzz");
var qurantext_service_1 = require("./qurantext.service");
var CSS_UNITS = 96.0 / 72.0;
var MIN_SCALE = 0.25;
var MAX_SCALE = 10.0;
var DEFAULT_SCALE_DELTA = 1.1;
var MAX_AUTO_SCALE = 1.25;
var PDFPageViewBuffer = /** @class */ (function () {
    function PDFPageViewBuffer(size) {
        this.size = size;
        this.data = [];
    }
    PDFPageViewBuffer.prototype.push = function (view) {
        var i = this.data.indexOf(view);
        if (i >= 0) {
            this.data.splice(i, 1);
        }
        this.data.push(view);
        if (this.data.length > this.size) {
            this.data.shift().destroy();
        }
    };
    ;
    PDFPageViewBuffer.prototype.resize = function (newSize, pagesToKeep) {
        this.size = newSize;
        if (pagesToKeep) {
            var pageIdsToKeep_1 = new Set();
            for (var i = 0, iMax = pagesToKeep.length; i < iMax; ++i) {
                pageIdsToKeep_1.add(pagesToKeep[i].id);
            }
            this.moveToEndOfArray(this.data, function (page) {
                return pageIdsToKeep_1.has(page.id);
            });
        }
        while (this.data.length > this.size) {
            this.data.shift().destroy();
        }
    };
    ;
    PDFPageViewBuffer.prototype.reset = function () {
        while (this.data.length > 0) {
            this.data.shift().destroy();
        }
    };
    PDFPageViewBuffer.prototype.moveToEndOfArray = function (arr, condition) {
        var moved = [], len = arr.length;
        var write = 0;
        for (var read = 0; read < len; ++read) {
            if (condition(arr[read])) {
                moved.push(arr[read]);
            }
            else {
                arr[write] = arr[read];
                ++write;
            }
        }
        for (var read = 0; write < len; ++read, ++write) {
            arr[write] = moved[read];
        }
    };
    return PDFPageViewBuffer;
}());
var DEFAULT_CACHE_SIZE = 10;
var HBOldMedinaComponent = function () {
    var _classDecorators = [(0, core_1.Component)({
            selector: 'app-hboldmedina-component',
            templateUrl: './hboldmedina.component.ts.html',
            styleUrls: ['./hboldmedina.component.ts.scss'],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _pageElements_decorators;
    var _pageElements_initializers = [];
    var _testcanvasRef_decorators;
    var _testcanvasRef_initializers = [];
    var _calculatewidthElem_decorators;
    var _calculatewidthElem_initializers = [];
    var _lineJustify_decorators;
    var _lineJustify_initializers = [];
    var _pageNumberBoxRef_decorators;
    var _pageNumberBoxRef_initializers = [];
    var _firstMyCustomDirective_decorators;
    var _firstMyCustomDirective_initializers = [];
    var _myPortal_decorators;
    var _myPortal_initializers = [];
    var _myReference_decorators;
    var _myReference_initializers = [];
    var _onResize_decorators;
    var _zout_decorators;
    var _zin_decorators;
    var HBOldMedinaComponent = _classThis = /** @class */ (function () {
        function HBOldMedinaComponent_1(sidebarContentsService, scrollDispatcher, ngZone, elRef, breakpointObserver, matDialog, router, tajweedService, _snackBar) {
            var _this = this;
            this.sidebarContentsService = (__runInitializers(this, _instanceExtraInitializers), sidebarContentsService);
            this.scrollDispatcher = scrollDispatcher;
            this.ngZone = ngZone;
            this.elRef = elRef;
            this.breakpointObserver = breakpointObserver;
            this.matDialog = matDialog;
            this.router = router;
            this.tajweedService = tajweedService;
            this._snackBar = _snackBar;
            this.CSS_UNITS = 96.0 / 72.0;
            this.sideBySideWidth = 992;
            this.hasFloatingToc = false;
            this.isOpened = false;
            this.pages = [];
            this.buffer = new PDFPageViewBuffer(DEFAULT_CACHE_SIZE);
            this.views = [];
            this.outline = [];
            this.pageSize = HBOldMedinaComponent.DEFAULT_PAGE_SIZE;
            this.defaultFontSize = HBOldMedinaComponent.DFAULT_FONT_SIZE;
            this.disableScroll = false;
            this.pageElements = __runInitializers(this, _pageElements_initializers, void 0);
            this.testcanvasRef = __runInitializers(this, _testcanvasRef_initializers, void 0);
            this.calculatewidthElem = __runInitializers(this, _calculatewidthElem_initializers, void 0);
            this.lineJustify = __runInitializers(this, _lineJustify_initializers, void 0);
            this.pageNumberBoxRef = __runInitializers(this, _pageNumberBoxRef_initializers, void 0);
            //@ViewChild(CdkScrollable, { static: false }) firstMyCustomDirective: CdkScrollable;
            this.firstMyCustomDirective = __runInitializers(this, _firstMyCustomDirective_initializers, void 0);
            this.myPortal = __runInitializers(this, _myPortal_initializers, void 0);
            this.myReference = __runInitializers(this, _myReference_initializers, void 0);
            this._isScrollModeHorizontal = false;
            this.fontScale = 1;
            this.loaded = false;
            this.hideElement = false;
            var nbav = window;
            this.router.events.subscribe(function (event) {
                if (event instanceof router_1.NavigationEnd) {
                    if (event.url.includes('about')) {
                        _this.hideElement = true;
                    }
                    else {
                        _this.hideElement = false;
                    }
                }
            });
            this.isSideBySide = breakpointObserver.isMatched('(min-width: ' + this.sideBySideWidth + 'px)');
            this.currentPageNumber = new forms_1.UntypedFormControl(1, [
                forms_1.Validators.required
            ]);
            this.form = new forms_1.UntypedFormGroup({
                currentPageNumber: this.currentPageNumber,
            });
            this.isJustifiedCtrl = new forms_1.UntypedFormControl(true);
            this.zoomCtrl = new forms_1.UntypedFormControl('page-fit');
            this.tajweedColorCtrl = new forms_1.UntypedFormControl(true);
            this.fontScaleCtrl = new forms_1.UntypedFormControl(this.fontScale);
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
            ];
            this.texFormat = true;
            this.totalPages = qurantext_service_1.quranTextService.nbPages;
            this.maxPages = this.totalPages;
            this.pages = new Array(this.maxPages);
            window.onerror = function (msg, url, lineNo, columnNo, error) {
                console.log("Error occured: " + msg + error.stack);
                _this.wasmStatus = "Error";
                return false;
            };
            this.itemSize = this.pageSize.height;
            this.pageNumberBoxIsMoved = false;
            this.dragPosition = { x: 0, y: 0 };
            this.constrainPosition = this.adjustPageNumBoxPosition.bind(this);
            this.fontsize = this.defaultFontSize;
        }
        Object.defineProperty(HBOldMedinaComponent_1.prototype, "mode", {
            get: function () { return this.isSideBySide ? 'side' : 'over'; },
            enumerable: false,
            configurable: true
        });
        HBOldMedinaComponent_1.prototype.ngOnInit = function () {
        };
        HBOldMedinaComponent_1.prototype.ngAfterViewInit = function () {
            var _this = this;
            this.viewAreaElement = this.firstMyCustomDirective.getElementRef().nativeElement;
            //this.loaded = true;
            setTimeout(function () {
                _this.ngZone.runOutsideAngular(function () { return __awaiter(_this, void 0, void 0, function () {
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, harfbuzz_1.loadHarfbuzz)("assets/hb.wasm")];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, (0, harfbuzz_1.loadAndCacheFont)("oldmadina", "assets/fonts/hb/oldmadina.otf")];
                            case 2:
                                _a.sent();
                                this.oldMEdinaFont = harfbuzz_1.harfbuzzFonts.get("oldmadina");
                                document.fonts.load("12px oldmadina").then(function () {
                                    _this.setViewport(_this.getScale(_this.zoomCtrl.value), false);
                                    _this.pageElements.forEach(function (page, index) {
                                        //this.views[index] = new PageView(page.nativeElement, index, this.quranService, this.viewport, this.renderingQueue);
                                        _this.views[index] = new page_view_1.PageView(page.nativeElement, index, _this.calculatewidthElem.nativeElement, _this.lineJustify.nativeElement, _this.viewport, _this.tajweedService, qurantext_service_1.quranTextService);
                                    });
                                    _this.scrollState = {
                                        right: true,
                                        down: true,
                                        lastX: _this.viewAreaElement.scrollLeft,
                                        lastY: _this.viewAreaElement.scrollTop
                                    };
                                    _this.scrollingSubscription = _this.firstMyCustomDirective.elementScrolled()
                                        .pipe(
                                    // Start off with a fake scroll event so we properly detect our initial position.
                                    (0, operators_1.startWith)(null), 
                                    // Collect multiple events into one until the next animation frame. This way if
                                    // there are multiple scroll events in the same frame we only need to recheck
                                    // our layout once.           
                                    (0, operators_1.auditTime)(0, rxjs_1.animationFrameScheduler)).subscribe(function (data) {
                                        if (!_this.disableScroll) {
                                            _this.scrollUpdated();
                                        }
                                        else {
                                            _this.disableScroll = false;
                                        }
                                    });
                                    _this.zoomCtrl.valueChanges.subscribe(function (value) {
                                        if (value !== 'custom') {
                                            _this.setZoom(value);
                                        }
                                    });
                                    _this.outline = qurantext_service_1.quranTextService.outline;
                                    _this.tajweedColorCtrl.valueChanges.subscribe(function (value) {
                                        _this.ngZone.runOutsideAngular(function () {
                                            _this.buffer.reset();
                                            _this.update();
                                        });
                                    });
                                    var layoutChanges = _this.breakpointObserver.observe([
                                        '(orientation: portrait)',
                                        '(orientation: landscape)',
                                        '(hover: none)',
                                    ]);
                                    layoutChanges.subscribe(function (result) {
                                        if (result.breakpoints['(hover: none)']) {
                                            if (result.breakpoints['(orientation: portrait)']) {
                                                _this.zoomCtrl.setValue('page-width');
                                            }
                                            else {
                                                _this.zoomCtrl.setValue('page-width');
                                            }
                                        }
                                        else {
                                            _this.zoomCtrl.setValue('page-fit');
                                        }
                                    });
                                    _this.fontScaleCtrl.valueChanges.subscribe(function (value) {
                                        _this.fontScale = _this.fontScaleCtrl.value;
                                        _this.ngZone.runOutsideAngular(function () {
                                            _this.setViewport(_this.scale, false, false);
                                            _this.buffer.reset();
                                            _this.updateWidth(false);
                                            _this.update();
                                        });
                                    });
                                });
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        };
        HBOldMedinaComponent_1.prototype.fontScaleChanged = function (event) {
            /*
            this.fontScale = event.value;
            this.ngZone.runOutsideAngular(() => {
              this.setViewport(this.scale, false, false);
              this.buffer.reset();
              this.updateWidth(false);
              this.update();
            });*/
        };
        HBOldMedinaComponent_1.prototype.adjustPageNumBoxPosition = function (point, dragRef) {
            if (this.pageNumberBoxRef) {
                var box = this.pageNumberBoxRef.element.nativeElement;
                var pos = this.pageNumberBoxRef.getFreeDragPosition();
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
        };
        HBOldMedinaComponent_1.prototype.formatLabel = function (value) {
            return Math.round(value * 100) + '%';
        };
        HBOldMedinaComponent_1.prototype.updatePageNumber = function (event) {
            var value = this.form.controls['currentPageNumber'].value;
            if (value < 1 || value > this.totalPages) {
                this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
            }
            else if (value !== this.currentPageNumber) {
                var offset = (value - 1) * this.itemSize;
                this.currentPageNumber = value;
                this.firstMyCustomDirective.scrollTo({ top: offset });
            }
        };
        HBOldMedinaComponent_1.prototype.ngOnDestroy = function () {
            var _a;
            (_a = this.scrollingSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        };
        HBOldMedinaComponent_1.prototype.navigateTo = function (page) {
            if (page === 'first') {
                this.setPage(1);
            }
            else if (page === 'prev') {
                this.setPage(this.currentPageNumber - 1);
            }
            else if (page === 'next') {
                this.setPage(this.currentPageNumber + 1);
            }
            else if (page === 'last') {
                this.setPage(this.totalPages);
            }
        };
        HBOldMedinaComponent_1.prototype.setPage = function (pageNumber) {
            var offset = (pageNumber - 1) * this.itemSize;
            this.currentPageNumber = pageNumber;
            this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
            this.firstMyCustomDirective.scrollTo({ top: offset });
        };
        HBOldMedinaComponent_1.prototype.setViewport = function (scale, updateView, duringZoom) {
            if (duringZoom === void 0) { duringZoom = false; }
            var borderWidth = 2;
            this.scale = scale;
            this.fontsize = this.defaultFontSize * scale * this.fontScale; /* this.fontScaleCtrl.value*/
            this.viewport = {
                width: Math.floor(this.pageSize.width * this.scale),
                height: Math.floor(this.pageSize.height * this.scale + borderWidth),
                fontSize: this.fontsize
            };
            this.itemSize = this.viewport.height;
            if (updateView) {
                this.updateWidth(duringZoom);
            }
        };
        HBOldMedinaComponent_1.prototype.onResize = function (event) {
            //if (this.container) {
            //    this.container.innerHTML = '';
            //    this.drawCanvas();
            //}
            var _this = this;
            var width = event.target.innerWidth;
            this.isSideBySide = width >= this.sideBySideWidth;
            this.movePageNumberBox();
            this.ngZone.runOutsideAngular(function () {
                _this.updateWidth(false);
                _this.update();
            });
        };
        HBOldMedinaComponent_1.prototype.update = function () {
            var _this = this;
            var visible = this._getVisiblePages();
            var visiblePages = visible.views, numVisiblePages = visiblePages.length;
            if (numVisiblePages === 0) {
                return;
            }
            var newCacheSize = Math.max(DEFAULT_CACHE_SIZE, 2 * numVisiblePages + 1);
            this.buffer.resize(newCacheSize, visiblePages);
            this.forceRendering(visible);
            if (visible.views && visible.views.length) {
                this.ngZone.run(function () {
                    _this.currentPageNumber = visible.views[0].id;
                    _this.form.controls['currentPageNumber'].setValue(_this.currentPageNumber);
                    _this.visibleViews = visible;
                    _this.loaded = true;
                });
            }
        };
        HBOldMedinaComponent_1.prototype.updateWidth = function (duringZoom) {
            var _this = this;
            this.views.forEach(function (a) { return a.update(_this.viewport, duringZoom); });
        };
        HBOldMedinaComponent_1.prototype.setOutline = function (outline) {
            var paddingTop = 0.2 * this.viewport.fontSize;
            var lineHeight = 1.77;
            var y = paddingTop + 1.77 * this.viewport.fontSize * outline.lineIndex;
            var offset = outline.pageIndex * this.itemSize + y;
            this.currentPageNumber = outline.pageIndex + 1;
            this.form.controls['currentPageNumber'].setValue(this.currentPageNumber);
            this.firstMyCustomDirective.scrollTo({ top: offset });
        };
        HBOldMedinaComponent_1.prototype.zoom = function (event) {
            var _this = this;
            var newScale;
            newScale = this.scale;
            newScale = (newScale * event.scale).toFixed(3);
            newScale = Math.ceil(newScale * 1000) / 1000;
            newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
            var oldScale = this.scale;
            var pageIndex = (this.visibleViews.first.id - 1) || 0;
            var element = this.views[pageIndex].div;
            var displY = event.clientY - 48;
            var displX = event.clientX;
            var top = this.firstMyCustomDirective.measureScrollOffset('top'), bottom = top + this.viewAreaElement.clientHeight;
            var start = this.firstMyCustomDirective.measureScrollOffset('start'), right = start + this.viewAreaElement.clientWidth;
            //this.zoomCtrl.setValue('custom');
            this.ngZone.runOutsideAngular(function () {
                var nbpagesY = (top + displY) / _this.itemSize;
                var nbpagesX = (start + displX) / _this.viewport.width;
                _this.disableScroll = true;
                _this.setViewport(newScale, true, true);
                var ytop = nbpagesY * _this.itemSize - displY;
                var xstart = nbpagesX * _this.viewport.width - displX;
                _this.firstMyCustomDirective.scrollTo({ top: ytop, start: xstart });
            });
        };
        HBOldMedinaComponent_1.prototype.endzoom = function (event) {
            var _this = this;
            this.ngZone.runOutsideAngular(function () {
                _this.views.forEach(function (a) { return a.update(_this.viewport, false); });
                _this.update();
            });
        };
        HBOldMedinaComponent_1.prototype.zoomIn = function () {
            var newScale = this.scale;
            newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.ceil(newScale * 10) / 10;
            newScale = Math.min(MAX_SCALE, newScale);
            this.zoomCtrl.setValue('custom');
            this.setScale(newScale);
        };
        //@HostListener('keydown.control')
        HBOldMedinaComponent_1.prototype.zout = function (event) {
            this.zoomIn();
            event.preventDefault();
        };
        HBOldMedinaComponent_1.prototype.setScale = function (newScale) {
            var _this = this;
            if (!this.visibleViews) {
                this.setViewport(newScale, true);
                return;
            }
            var oldScale = this.scale;
            //let pageIndex = this.currentPageNumber - 1;
            var pageIndex = (this.visibleViews.first.id - 1) || 0;
            var element = this.views[pageIndex].div;
            var top = this.firstMyCustomDirective.measureScrollOffset('top'), bottom = top + this.viewAreaElement.clientHeight;
            var left = this.firstMyCustomDirective.measureScrollOffset('start'), right = left + this.viewAreaElement.clientWidth;
            /*
            const currentWidth = element.offsetLeft + element.clientLeft;
            const currentHeight = element.offsetTop + element.clientTop;
            const viewWidth = element.clientWidth, viewHeight = element.clientHeight;
            const viewRight = currentWidth + viewWidth;
            const viewBottom = currentHeight + viewHeight;
        
            const hiddenHeight = Math.max(0, top - currentHeight) +    Math.max(0, viewBottom - bottom);
            const hiddenWidth = Math.max(0, left - currentWidth) + Math.max(0, viewRight - right);*/
            var offset = ((Math.max(0, top - element.offsetTop) / oldScale) * newScale); // + 1;
            this.ngZone.runOutsideAngular(function () {
                _this.setViewport(newScale, true);
                _this.firstMyCustomDirective.scrollTo({ top: pageIndex * _this.itemSize + offset });
                _this.update();
            });
        };
        HBOldMedinaComponent_1.prototype.zin = function (event) {
            this.zoomOut();
            event.preventDefault();
        };
        HBOldMedinaComponent_1.prototype.zoomOut = function () {
            var newScale = this.scale;
            newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.floor(newScale * 10) / 10;
            newScale = Math.max(MIN_SCALE, newScale);
            this.zoomCtrl.setValue('custom');
            this.setScale(newScale);
        };
        HBOldMedinaComponent_1.prototype.isViewFinished = function (view) {
            return view.renderingState === rendering_states_1.RenderingStates.FINISHED;
        };
        HBOldMedinaComponent_1.prototype.getHighestPriority = function (visible, views, scrolledDown, totalPages) {
            var visibleViews = visible.views;
            var numVisible = visibleViews.length;
            if (numVisible === 0) {
                return null;
            }
            for (var i = 0; i < numVisible; ++i) {
                var view = visibleViews[i].view;
                if (!this.isViewFinished(view)) {
                    return view;
                }
            }
            // All the visible views have rendered; try to render next/previous pages.
            if (scrolledDown) {
                var nextPageIndex = visible.last.id;
                // IDs start at 1, so no need to add 1.
                if (views[nextPageIndex] && !this.isViewFinished(views[nextPageIndex]) && nextPageIndex < totalPages) {
                    return views[nextPageIndex];
                }
            }
            else {
                var previousPageIndex = visible.first.id - 2;
                if (views[previousPageIndex] &&
                    !this.isViewFinished(views[previousPageIndex])) {
                    return views[previousPageIndex];
                }
            }
            // Everything that needs to be rendered has been.
            return null;
        };
        HBOldMedinaComponent_1.prototype.forceRendering = function (currentlyVisiblePages) {
            var visiblePages = currentlyVisiblePages || this._getVisiblePages();
            var scrollAhead = (this._isScrollModeHorizontal ? this.scrollState.right : this.scrollState.down);
            var pageView = this.getHighestPriority(visiblePages, this.views, scrollAhead, this.totalPages);
            if (pageView) {
                this.buffer.push(pageView);
                this.renderView(pageView, this.canvasWidth, this.canvasHeight, this.texFormat, this.tajweedColorCtrl.value);
                return true;
            }
            return false;
        };
        HBOldMedinaComponent_1.prototype.renderView = function (view, canvasWidth, canvasHeight, texFormat, tajweedColor) {
            var _this = this;
            var oldHigh = this.highestPriorityPage;
            switch (view.renderingState) {
                case rendering_states_1.RenderingStates.FINISHED:
                    return false;
                case rendering_states_1.RenderingStates.PAUSED:
                    this.highestPriorityPage = view;
                    view.resume();
                    break;
                case rendering_states_1.RenderingStates.RUNNING:
                    this.highestPriorityPage = view;
                    break;
                case rendering_states_1.RenderingStates.INITIAL:
                    this.highestPriorityPage = view;
                    view.draw(canvasWidth, canvasHeight, texFormat, tajweedColor)
                        .catch(function (error) {
                        console.log(error);
                    })
                        .finally(function () {
                        // console.log("Finish rendering view " + view.id + " state=" + view.renderingState)          
                        _this.forceRendering(null);
                    });
                    break;
            }
            if (oldHigh != null && oldHigh != this.highestPriorityPage) {
                oldHigh.pause();
            }
            return true;
        };
        HBOldMedinaComponent_1.prototype._getVisiblePages = function () {
            var scrollEl = this.firstMyCustomDirective.getElementRef().nativeElement;
            var top = this.firstMyCustomDirective.measureScrollOffset('top');
            if (top < 0)
                top = 0;
            var bottom = top + scrollEl.clientHeight;
            var left = this.firstMyCustomDirective.measureScrollOffset('start'), right = left + scrollEl.clientWidth;
            var firstVisibleIndex = Math.floor(top / this.itemSize);
            var lastVisibleIndex = Math.floor(bottom / this.itemSize);
            lastVisibleIndex = Math.min(this.totalPages - 1, lastVisibleIndex);
            //lastVisibleIndex = firstVisibleIndex + 1;
            var visible = [];
            for (var currIndex = firstVisibleIndex; currIndex <= lastVisibleIndex; currIndex++) {
                var view = this.views[currIndex], element = view.div;
                var currentWidth = element.offsetLeft + element.clientLeft;
                var currentHeight = element.offsetTop + element.clientTop;
                var viewWidth = element.clientWidth, viewHeight = element.clientHeight;
                var viewRight = currentWidth + viewWidth;
                var viewBottom = currentHeight + viewHeight;
                var hiddenHeight = Math.max(0, top - currentHeight) +
                    Math.max(0, viewBottom - bottom);
                var hiddenWidth = Math.max(0, left - currentWidth) +
                    Math.max(0, viewRight - right);
                var percent = ((viewHeight - hiddenHeight) * (viewWidth - hiddenWidth) *
                    100 / viewHeight / viewWidth) | 0;
                visible.push({
                    id: view.id,
                    x: currentWidth,
                    y: currentHeight,
                    view: view,
                    percent: percent,
                });
            }
            var first = visible[0], last = visible[visible.length - 1];
            visible.sort(function (a, b) {
                var pc = a.percent - b.percent;
                if (Math.abs(pc) > 0.001) {
                    return -pc;
                }
                return a.id - b.id; // ensure stability
            });
            return { first: first, last: last, views: visible, };
        };
        HBOldMedinaComponent_1.prototype.updateHostClasses = function () {
        };
        HBOldMedinaComponent_1.prototype.getScale = function (value) {
            var _a;
            var container = this.elRef.nativeElement;
            var scale = parseFloat(value);
            if (scale > 0) {
                return scale;
            }
            else {
                var SCROLLBAR_PADDING = 6;
                var VERTICAL_PADDING = 0;
                var noPadding = false;
                var hPadding = noPadding ? 0 : SCROLLBAR_PADDING;
                var vPadding = noPadding ? 0 : VERTICAL_PADDING;
                if (!noPadding && this._isScrollModeHorizontal) {
                    _a = [vPadding, hPadding], hPadding = _a[0], vPadding = _a[1]; // Swap the padding values.
                }
                var pageWidthScale = (container.clientWidth) / (this.pageSize.width);
                var pageHeightScale = (container.clientHeight - vPadding) / (this.pageSize.height);
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
        };
        HBOldMedinaComponent_1.prototype.setZoom = function (value) {
            var scale = this.getScale(value);
            this.setScale(scale);
        };
        HBOldMedinaComponent_1.prototype.toggleFullScreen = function () {
            var doc = window.document;
            var docEl = this.viewAreaElement;
            var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
            var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
            if (requestFullScreen && !doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
                requestFullScreen.call(docEl);
            }
            else if (cancelFullScreen) {
                cancelFullScreen.call(doc);
            }
        };
        HBOldMedinaComponent_1.prototype.pageNumberBoxMoved = function (event) {
            var box = this.pageNumberBoxRef.element.nativeElement;
            var pos = this.pageNumberBoxRef.getFreeDragPosition();
            //var height = this.viewAreaElement.clientHeight - box.offsetHeight;
            var height = box.parentElement.clientHeight - box.offsetHeight;
            var oldoffset = this.firstMyCustomDirective.measureScrollOffset('top');
            if ((pos.y === 0 && oldoffset === 0)
                || (pos.y === height && (oldoffset + this.viewAreaElement.clientHeight) === this.viewAreaElement.scrollHeight))
                return;
            var offset = Math.floor(pos.y / height * this.viewAreaElement.scrollHeight);
            this.pageNumberBoxIsMoved = true;
            this.firstMyCustomDirective.scrollTo({ top: offset });
        };
        HBOldMedinaComponent_1.prototype.movePageNumberBox = function () {
            var offset = this.firstMyCustomDirective.measureScrollOffset('top');
            if (this.viewAreaElement.scrollHeight) {
                var perc = offset / (this.viewAreaElement.scrollHeight);
                var box = this.pageNumberBoxRef.element.nativeElement;
                var top = Math.floor((box.parentElement.clientHeight - box.offsetHeight) * perc);
                this.dragPosition = { x: 0, y: top };
            }
        };
        HBOldMedinaComponent_1.prototype.scrollUpdated = function () {
            var _this = this;
            var currentX = this.viewAreaElement.scrollLeft;
            var lastX = this.scrollState.lastX;
            if (currentX !== lastX) {
                this.scrollState.right = currentX > lastX;
            }
            this.scrollState.lastX = currentX;
            var currentY = this.viewAreaElement.scrollTop;
            var lastY = this.scrollState.lastY;
            if (currentY !== lastY) {
                this.scrollState.down = currentY > lastY;
            }
            this.scrollState.lastY = currentY;
            if (!this.pageNumberBoxIsMoved) {
                this.movePageNumberBox();
            }
            else {
                this.pageNumberBoxIsMoved = false;
            }
            this.ngZone.runOutsideAngular(function () {
                _this.update();
            });
        };
        HBOldMedinaComponent_1.prototype.watchScroll = function (viewAreaElement, callback) {
            var debounceScroll = function (evt) {
                if (rAF) {
                    return;
                }
                // schedule an invocation of scroll for next animation frame.
                rAF = window.requestAnimationFrame(function viewAreaElementScrolled() {
                    rAF = null;
                    var currentX = viewAreaElement.scrollLeft;
                    var lastX = state.lastX;
                    if (currentX !== lastX) {
                        state.right = currentX > lastX;
                    }
                    state.lastX = currentX;
                    var currentY = viewAreaElement.scrollTop;
                    var lastY = state.lastY;
                    if (currentY !== lastY) {
                        state.down = currentY > lastY;
                    }
                    state.lastY = currentY;
                    callback(state);
                });
            };
            var state = {
                right: true,
                down: true,
                lastX: viewAreaElement.scrollLeft,
                lastY: viewAreaElement.scrollTop,
                _eventHandler: debounceScroll,
            };
            var rAF = null;
            viewAreaElement.addEventListener('scroll', debounceScroll, { capture: true, passive: true });
            return state;
        };
        HBOldMedinaComponent_1.prototype.openAbout = function () {
            var dialogRef = this.matDialog.open(about_component_1.AboutComponent, {
                height: '98%',
                width: '100vw',
                panelClass: 'full-screen-modal',
                data: {}
            });
            dialogRef.afterClosed().subscribe(function (result) {
                console.log('The dialog was closed');
            });
        };
        return HBOldMedinaComponent_1;
    }());
    __setFunctionName(_classThis, "HBOldMedinaComponent");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _pageElements_decorators = [(0, core_1.ViewChildren)('page')];
        _testcanvasRef_decorators = [(0, core_1.ViewChild)('testcanvas', { static: false })];
        _calculatewidthElem_decorators = [(0, core_1.ViewChild)('calculatewidthElem', { static: false })];
        _lineJustify_decorators = [(0, core_1.ViewChild)('lineJustify', { static: false })];
        _pageNumberBoxRef_decorators = [(0, core_1.ViewChild)(drag_drop_1.CdkDrag, { static: false })];
        _firstMyCustomDirective_decorators = [(0, core_1.ViewChild)('viewerContainer', { static: false, read: scrolling_1.CdkScrollable })];
        _myPortal_decorators = [(0, core_1.ViewChild)('myPortal', { static: true })];
        _myReference_decorators = [(0, core_1.ViewChild)('myReference', { static: true })];
        _onResize_decorators = [(0, core_1.HostListener)('window:resize', ['$event'])];
        _zout_decorators = [(0, core_1.HostListener)('document:keydown.control.+', ['$event']), (0, core_1.HostListener)('document:keydown.control.=', ['$event'])];
        _zin_decorators = [(0, core_1.HostListener)('document:keydown.control.-', ['$event'])];
        __esDecorate(_classThis, null, _onResize_decorators, { kind: "method", name: "onResize", static: false, private: false, access: { has: function (obj) { return "onResize" in obj; }, get: function (obj) { return obj.onResize; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _zout_decorators, { kind: "method", name: "zout", static: false, private: false, access: { has: function (obj) { return "zout" in obj; }, get: function (obj) { return obj.zout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _zin_decorators, { kind: "method", name: "zin", static: false, private: false, access: { has: function (obj) { return "zin" in obj; }, get: function (obj) { return obj.zin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, null, _pageElements_decorators, { kind: "field", name: "pageElements", static: false, private: false, access: { has: function (obj) { return "pageElements" in obj; }, get: function (obj) { return obj.pageElements; }, set: function (obj, value) { obj.pageElements = value; } }, metadata: _metadata }, _pageElements_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _testcanvasRef_decorators, { kind: "field", name: "testcanvasRef", static: false, private: false, access: { has: function (obj) { return "testcanvasRef" in obj; }, get: function (obj) { return obj.testcanvasRef; }, set: function (obj, value) { obj.testcanvasRef = value; } }, metadata: _metadata }, _testcanvasRef_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _calculatewidthElem_decorators, { kind: "field", name: "calculatewidthElem", static: false, private: false, access: { has: function (obj) { return "calculatewidthElem" in obj; }, get: function (obj) { return obj.calculatewidthElem; }, set: function (obj, value) { obj.calculatewidthElem = value; } }, metadata: _metadata }, _calculatewidthElem_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _lineJustify_decorators, { kind: "field", name: "lineJustify", static: false, private: false, access: { has: function (obj) { return "lineJustify" in obj; }, get: function (obj) { return obj.lineJustify; }, set: function (obj, value) { obj.lineJustify = value; } }, metadata: _metadata }, _lineJustify_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _pageNumberBoxRef_decorators, { kind: "field", name: "pageNumberBoxRef", static: false, private: false, access: { has: function (obj) { return "pageNumberBoxRef" in obj; }, get: function (obj) { return obj.pageNumberBoxRef; }, set: function (obj, value) { obj.pageNumberBoxRef = value; } }, metadata: _metadata }, _pageNumberBoxRef_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _firstMyCustomDirective_decorators, { kind: "field", name: "firstMyCustomDirective", static: false, private: false, access: { has: function (obj) { return "firstMyCustomDirective" in obj; }, get: function (obj) { return obj.firstMyCustomDirective; }, set: function (obj, value) { obj.firstMyCustomDirective = value; } }, metadata: _metadata }, _firstMyCustomDirective_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _myPortal_decorators, { kind: "field", name: "myPortal", static: false, private: false, access: { has: function (obj) { return "myPortal" in obj; }, get: function (obj) { return obj.myPortal; }, set: function (obj, value) { obj.myPortal = value; } }, metadata: _metadata }, _myPortal_initializers, _instanceExtraInitializers);
        __esDecorate(null, null, _myReference_decorators, { kind: "field", name: "myReference", static: false, private: false, access: { has: function (obj) { return "myReference" in obj; }, get: function (obj) { return obj.myReference; }, set: function (obj, value) { obj.myReference = value; } }, metadata: _metadata }, _myReference_initializers, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HBOldMedinaComponent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.DEFAULT_SCALE = 15 / 1000;
    _classThis.DEFAULT_PAGE_SIZE = { width: 255, height: 410, marginWidth: HBOldMedinaComponent.DEFAULT_SCALE * 400 };
    _classThis.DFAULT_FONT_SIZE = HBOldMedinaComponent.DEFAULT_PAGE_SIZE.width / (17000 / 1000);
    (function () {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HBOldMedinaComponent = _classThis;
}();
exports.HBOldMedinaComponent = HBOldMedinaComponent;
//# sourceMappingURL=hboldmedina.component.js.map