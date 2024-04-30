"use strict";
/*
 * Copyright 2012 Mozilla Foundation (Some code is derived from https://github.com/mozilla/pdf.js/blob/master/web/pdf_page_view.js)
 * Copyright (c) 2019-2020 Amine Anane. http: //digitalkhatt/license
*/
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageView = void 0;
var rendering_states_1 = require("./rendering_states");
var harfbuzz_1 = require("./harfbuzz");
var just_service_1 = require("./just.service");
var PageView = /** @class */ (function () {
    function PageView(div, pageIndex, calculatewidthElem, lineJustify, viewport, tajweedService, quranTextService) {
        this.div = div;
        this.pageIndex = pageIndex;
        this.tajweedService = tajweedService;
        this.quranTextService = quranTextService;
        this.maxIterTime = 8000;
        this.renderingState = rendering_states_1.RenderingStates.INITIAL;
        this.calculatewidthElem = calculatewidthElem;
        this.lineJustify = lineJustify;
        this.id = pageIndex + 1;
        this.renderingId = 'page' + this.id;
        this.viewport = viewport;
        this.div.style.width = this.viewport.width + 'px';
        this.div.style.height = this.viewport.height + 'px';
        this.oldMedinaFont = harfbuzz_1.harfbuzzFonts.get("oldmadina");
        var svgAyaElem = document.getElementById("ayaGlyph");
        this.ayaSvgGroup = svgAyaElem.firstElementChild;
        /*
        this.loadingIconDiv = document.createElement('div');
        this.loadingIconDiv.className = 'loadingIcon';
        div.appendChild(this.loadingIconDiv);*/
        this.zoomLayer = null;
        this.quranText = quranTextService.quranText;
    }
    PageView.prototype.pause = function () {
        var _this = this;
        if (this.renderingState === rendering_states_1.RenderingStates.RUNNING && this.resume == null) {
            this.renderingState = rendering_states_1.RenderingStates.PAUSED;
            this.pausePromise = new Promise(function (resolve, reject) {
                _this.resume = function () {
                    if (_this.renderingState === rendering_states_1.RenderingStates.PAUSED) {
                        resolve(true);
                        _this.renderingState = rendering_states_1.RenderingStates.RUNNING;
                    }
                    else {
                        resolve(false);
                    }
                    _this.resume = null;
                };
            });
        }
    };
    PageView.prototype.isPaused = function () {
        return this.renderingState === rendering_states_1.RenderingStates.PAUSED;
    };
    PageView.prototype.draw = function (canvasWidth, canvasHeight, texFormat, tajweedColor) {
        return __awaiter(this, void 0, void 0, function () {
            var startDraw, pageElem, lineCount, temp, scale, defaultMargin, lineWidth, fontSizeLineWidthRatio, maxFontSizeRatioWithoutOverFull, lineIndex, lineInfo, lineText, lineWidthUPEM, desiredWidth, currentLineWidth, lineIndex, lineInfo, lineElem, margin, newlineWidth, lineText, lineTextInfo, justResult, lineText, innerSpan, lineText, cont, endDraw;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startDraw = performance.now();
                        if (this.renderingState !== rendering_states_1.RenderingStates.INITIAL) {
                            return [2 /*return*/];
                        }
                        this.lastDrawTime = performance.now();
                        pageElem = this.div;
                        this.renderingState = rendering_states_1.RenderingStates.RUNNING;
                        this.lineJustify.style.width = pageElem.style.width;
                        this.lineJustify.style.fontSize = pageElem.style.fontSize;
                        lineCount = this.quranText[this.pageIndex].length;
                        temp = document.createElement('div');
                        scale = this.viewport.width / just_service_1.PAGE_WIDTH;
                        defaultMargin = just_service_1.MARGIN * scale;
                        lineWidth = this.viewport.width - 2 * defaultMargin;
                        fontSizeLineWidthRatio = this.viewport.fontSize / lineWidth;
                        maxFontSizeRatioWithoutOverFull = 1;
                        for (lineIndex = 0; lineIndex < lineCount; lineIndex++) {
                            lineInfo = this.quranTextService.getLineInfo(this.pageIndex, lineIndex);
                            if (lineInfo.lineType === 0 || (lineInfo.lineType == 2 && (this.pageIndex == 0 || this.pageIndex == 1))) {
                                lineText = this.quranText[this.pageIndex][lineIndex];
                                lineWidthUPEM = just_service_1.FONTSIZE / fontSizeLineWidthRatio;
                                desiredWidth = lineInfo.lineWidthRatio * lineWidthUPEM;
                                currentLineWidth = (0, harfbuzz_1.getWidth)(lineText, this.oldMedinaFont, just_service_1.FONTSIZE, null);
                                if (desiredWidth < currentLineWidth) {
                                    maxFontSizeRatioWithoutOverFull = Math.min(desiredWidth / currentLineWidth, maxFontSizeRatioWithoutOverFull);
                                }
                            }
                        }
                        lineIndex = 0;
                        _a.label = 1;
                    case 1:
                        if (!(lineIndex < lineCount)) return [3 /*break*/, 7];
                        lineInfo = this.quranTextService.getLineInfo(this.pageIndex, lineIndex);
                        lineElem = document.createElement('div');
                        margin = defaultMargin;
                        lineElem.classList.add('line');
                        if (lineInfo.lineType === 0 || (lineInfo.lineType == 2 && (this.pageIndex == 0 || this.pageIndex == 1))) {
                            if (lineInfo.lineWidthRatio !== 1) {
                                newlineWidth = lineWidth * lineInfo.lineWidthRatio;
                                margin += (lineWidth - newlineWidth) / 2;
                            }
                            lineElem.style.marginLeft = margin + "px";
                            lineElem.style.marginRight = lineElem.style.marginLeft;
                            lineElem.style.height = just_service_1.INTERLINE * scale + "px";
                            lineText = this.quranText[this.pageIndex][lineIndex];
                            this.lineJustify.appendChild(lineElem);
                            lineTextInfo = (0, just_service_1.analyzeLineForJust)(this.quranTextService, this.pageIndex, lineIndex);
                            justResult = (0, just_service_1.justifyLine)(lineTextInfo, this.oldMedinaFont, fontSizeLineWidthRatio * maxFontSizeRatioWithoutOverFull / lineInfo.lineWidthRatio);
                            justResult.fontSizeRatio = justResult.fontSizeRatio * maxFontSizeRatioWithoutOverFull;
                            this.renderLine(lineElem, lineIndex, lineTextInfo, justResult, tajweedColor);
                        }
                        else if (lineInfo.lineType === 1) {
                            lineElem.style.textAlign = "center";
                            lineElem.style.marginLeft = margin + "px";
                            lineElem.style.marginRight = lineElem.style.marginLeft;
                            lineElem.style.height = just_service_1.INTERLINE * scale + "px";
                            lineText = this.quranText[this.pageIndex][lineIndex];
                            lineElem.classList.add("linesuran");
                            if (this.pageIndex === 0 || this.pageIndex === 1) {
                                lineElem.style.paddingBottom = 2 * scale * just_service_1.INTERLINE + "px";
                            }
                            innerSpan = document.createElement('span');
                            innerSpan.textContent = lineText;
                            innerSpan.classList.add("innersura");
                            innerSpan.style.lineHeight = lineElem.style.height;
                            lineElem.appendChild(innerSpan);
                        }
                        else if (lineInfo.lineType === 2) /* basmala */ {
                            this.applyTajweed(tajweedColor, lineElem, lineIndex);
                            lineElem.style.textAlign = "center";
                            lineElem.style.marginLeft = margin + "px";
                            lineElem.style.marginRight = lineElem.style.marginLeft;
                            lineElem.style.height = just_service_1.INTERLINE * scale + "px";
                            lineText = this.quranText[this.pageIndex][lineIndex];
                            lineElem.style.fontFeatureSettings = "'basm'";
                        }
                        temp.appendChild(lineElem);
                        if (!(performance.now() - this.lastDrawTime > 16)) return [3 /*break*/, 6];
                        return [4 /*yield*/, new Promise(function (resolve) {
                                requestAnimationFrame(resolve);
                            })];
                    case 2:
                        _a.sent();
                        if (!this.isPaused()) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.pausePromise];
                    case 3:
                        cont = _a.sent();
                        if (!cont)
                            return [2 /*return*/];
                        return [3 /*break*/, 5];
                    case 4:
                        if (this.renderingState !== rendering_states_1.RenderingStates.RUNNING)
                            return [2 /*return*/];
                        _a.label = 5;
                    case 5:
                        this.lastDrawTime = performance.now();
                        _a.label = 6;
                    case 6:
                        lineIndex++;
                        return [3 /*break*/, 1];
                    case 7:
                        while (temp.firstChild) {
                            pageElem.appendChild(temp.firstChild);
                        }
                        this.renderingState = rendering_states_1.RenderingStates.FINISHED;
                        if (this.loadingIconDiv) {
                            this.div.removeChild(this.loadingIconDiv);
                            delete this.loadingIconDiv;
                        }
                        endDraw = performance.now();
                        console.info("draw page ".concat(this.id, " take ").concat(endDraw - startDraw, " ms"));
                        return [2 /*return*/];
                }
            });
        });
    };
    PageView.prototype.renderLine = function (lineElem, lineIndex, lineTextInfo, justResult, tajweedColor) {
        var _a;
        var lineText = this.quranText[this.pageIndex][lineIndex];
        var features = [];
        if (((_a = justResult.fontFeatures) === null || _a === void 0 ? void 0 : _a.size) > 0) {
            for (var wordIndex = 0; wordIndex < lineTextInfo.wordInfos.length; wordIndex++) {
                var wordInfo = lineTextInfo.wordInfos[wordIndex];
                for (var i = wordInfo.startIndex; i <= wordInfo.endIndex; i++) {
                    var justInfo = justResult.fontFeatures.get(i);
                    if (justInfo) {
                        for (var _i = 0, justInfo_1 = justInfo; _i < justInfo_1.length; _i++) {
                            var feat = justInfo_1[_i];
                            features.push({
                                tag: feat.name,
                                value: feat.value,
                                start: i,
                                end: i + 1
                            });
                        }
                    }
                }
            }
        }
        var tajweedResult = tajweedColor ? this.tajweedService.applyTajweed(this.quranText, this.pageIndex, lineIndex) : new Map();
        var buffer = new harfbuzz_1.HarfBuzzBuffer();
        buffer.setDirection('rtl');
        buffer.setLanguage(harfbuzz_1.hb.arabLanguage);
        buffer.setScript(harfbuzz_1.hb.arabScript);
        buffer.setClusterLevel(1);
        buffer.addText(lineText);
        buffer.shape(this.oldMedinaFont, features);
        var result = buffer.json();
        buffer.destroy();
        var lineInfo = this.quranTextService.getLineInfo(this.pageIndex, lineIndex);
        var startSajdaIndex;
        var endSajdaIndex;
        if (lineInfo.sajda) {
            startSajdaIndex = lineTextInfo.wordInfos[lineInfo.sajda.startWordIndex].startIndex;
            endSajdaIndex = lineTextInfo.wordInfos[lineInfo.sajda.endWordIndex].endIndex;
        }
        var glyphs = new Map();
        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute('shape-rendering', 'geometricPrecision');
        svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
        var lineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svg.appendChild(lineGroup);
        var currentxPos = 0;
        var glyphScale = this.viewport.fontSize / just_service_1.FONTSIZE;
        var startSajdaPos;
        var endSajdaPos;
        for (var glyphIndex = result.length - 1; glyphIndex >= 0; glyphIndex--) {
            var glyph = result[glyphIndex];
            var pathString = glyphs.get(glyph.GlyphId);
            if (pathString === undefined) {
                pathString = this.oldMedinaFont.glyphToSvgPath(glyph.GlyphId);
                if (lineText.charCodeAt(glyph.Cluster) === 0x06DD) {
                    pathString = [pathString.split("Z").slice(14).filter(function (a) { return a.length; }).join('Z')];
                    glyphs.set(glyph.GlyphId, pathString);
                }
                else {
                    glyphs.set(glyph.GlyphId, pathString);
                }
            }
            var space = lineTextInfo.spaces.get(glyph.Cluster);
            if (startSajdaIndex && glyph.Cluster === startSajdaIndex && !startSajdaPos) {
                startSajdaPos = currentxPos;
            }
            if (endSajdaIndex && glyph.Cluster === endSajdaIndex && !endSajdaPos) {
                endSajdaPos = currentxPos;
            }
            if (space === 2 /* SpaceType.Aya */) {
                currentxPos -= justResult.ayaSpacing;
            }
            else if (space === 1 /* SpaceType.Simple */) {
                currentxPos -= justResult.simpleSpacing;
            }
            else {
                currentxPos -= glyph.XAdvance;
            }
            if (pathString) {
                if (typeof pathString !== 'string') {
                    //Aya
                    var ayaGroup = this.ayaSvgGroup.cloneNode(true);
                    ayaGroup.setAttribute("transform", "scale (1,-1) translate(" + (currentxPos + glyph.XOffset) + " " + -885 + ")");
                    lineGroup.appendChild(ayaGroup);
                    pathString = pathString[0];
                }
                var newpath = document.createElementNS('http://www.w3.org/2000/svg', "path");
                newpath.setAttribute("d", pathString);
                newpath.setAttribute("transform", "translate(" + (currentxPos + glyph.XOffset) + " " + glyph.YOffset + ")");
                if (tajweedColor) {
                    var tajweedClass = tajweedResult.get(glyph.Cluster);
                    if (tajweedClass) {
                        newpath.classList.add(tajweedClass);
                    }
                }
                lineGroup.appendChild(newpath);
            }
        }
        if (startSajdaPos && endSajdaPos) {
            var line = document.createElementNS('http://www.w3.org/2000/svg', "line");
            line.setAttribute('x1', startSajdaPos);
            line.setAttribute('x2', endSajdaPos);
            line.setAttribute('y1', "1000");
            line.setAttribute('y2', "1000");
            line.setAttribute('stroke', 'black');
            line.setAttribute('stroke-width', '60');
            lineGroup.appendChild(line);
        }
        lineGroup.setAttribute("transform", "scale(" + glyphScale * justResult.fontSizeRatio + "," + -glyphScale * justResult.fontSizeRatio + ")");
        //lineGroup.transform.baseVal.getItem(0).setScale(this.viewport.scale, this.viewport.scale);
        var x = glyphScale * currentxPos * 2;
        var margin = 400 * glyphScale;
        var width = -x + margin;
        var height = lineElem.clientHeight * 2;
        svg.setAttribute('viewBox', "".concat(x, " ").concat(-height / 2, " ").concat(width, " ").concat(height));
        svg.setAttribute('width', width.toString());
        svg.setAttribute('height', height.toString());
        svg.style.position = "relative";
        svg.style.right = -margin + "px";
        svg.style.top = -lineElem.clientHeight / 2 + "px";
        lineElem.appendChild(svg);
    };
    PageView.prototype.applyTajweed = function (tajweedColor, lineElem, lineIndex) {
        var lineText = this.quranText[this.pageIndex][lineIndex];
        if (!tajweedColor) {
            lineElem.textContent = lineText;
            return;
        }
        var result = this.tajweedService.applyTajweed(this.quranText, this.pageIndex, lineIndex);
        for (var i = 0; i < lineText.length; i++) {
            var char = lineText.charAt(i);
            var tajweed = result.get(i);
            if (tajweed) {
                if (lineElem.lastChild && lineElem.lastChild.nodeType == Node.ELEMENT_NODE) {
                    var node = lineElem.lastChild;
                    if (node.classList === tajweed) {
                        node.textContent = node.textContent + char;
                        continue;
                    }
                }
                var span = document.createElement('span');
                span.classList.add(tajweed);
                span.textContent = char;
                lineElem.appendChild(span);
            }
            else {
                if (lineElem.lastChild && lineElem.lastChild.nodeType == Node.TEXT_NODE) {
                    lineElem.lastChild.textContent = lineElem.lastChild.textContent + char;
                }
                else {
                    lineElem.appendChild(document.createTextNode(char));
                }
            }
        }
    };
    PageView.prototype.reset = function (keepZoomLayer) {
        if (keepZoomLayer === void 0) { keepZoomLayer = false; }
        var div = this.div;
        div.style.width = this.viewport.width + 'px';
        div.style.height = this.viewport.height + 'px';
        div.style.fontSize = this.viewport.fontSize + 'px';
        this.renderingState = rendering_states_1.RenderingStates.INITIAL;
        if (this.resume) {
            this.resume();
        }
        div.removeAttribute('data-loaded');
        var currentZoomLayerNode = (keepZoomLayer && this.zoomLayer) || null;
        while (div.firstChild) {
            div.removeChild(div.lastChild);
        }
    };
    PageView.prototype.update = function (viewport, duringZoom) {
        if (duringZoom === void 0) { duringZoom = false; }
        this.viewport = viewport;
        if (this.zoomLayer) {
            this.zoomLayer.style.width = this.viewport.width + 'px';
            this.zoomLayer.style.height = this.viewport.height + 'px';
        }
        this.reset(true);
    };
    PageView.prototype.destroy = function () {
        this.reset(false);
    };
    PageView.prototype.resetZoomLayer = function (removeFromDOM) {
        if (removeFromDOM === void 0) { removeFromDOM = false; }
        if (!this.zoomLayer) {
            return;
        }
        var zoomLayerCanvas = this.zoomLayer; //.firstChild;
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
    };
    return PageView;
}());
exports.PageView = PageView;
//# sourceMappingURL=page_view.js.map