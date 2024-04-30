"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quranTextService = exports.QuranTextService = void 0;
var core_1 = require("@angular/core");
var quran_text_old_madinah_1 = require("./quran_text_old_madinah");
var QuranTextService = function () {
    var _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root',
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var QuranTextService = _classThis = /** @class */ (function () {
        function QuranTextService_1() {
            this._outline = [];
            this._sajsdas = [];
            this.madinaLineWidths = new Map([
                [600 * 15 + 9, 0.84],
                [602 * 15 + 5, 0.61],
                [602 * 15 + 15, 0.59],
                [603 * 15 + 10, 0.68],
                [604 * 15 + 4, 0.836],
                [604 * 15 + 9, 0.836],
                [604 * 15 + 14, 0.717],
                [604 * 15 + 15, 0.54],
            ]);
            this._quranText = quran_text_old_madinah_1.quranText;
            var start = performance.now();
            var suraWord = "سُورَةُ";
            var bism = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
            var surabismpattern = "^(?<sura>"
                + suraWord + " .*)|(?<bism>"
                + bism
                + "|" + "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
                + ")$";
            var sajdapatterns = "(وَٱسْجُدْ) وَٱقْتَرِب|(خَرُّوا۟ سُجَّدࣰا)|(وَلِلَّهِ يَسْجُدُ)|(يَسْجُدُونَ)۩|(فَٱسْجُدُوا۟ لِلَّهِ)|(وَٱسْجُدُوا۟ لِلَّهِ)|(أَلَّا يَسْجُدُوا۟ لِلَّهِ)|(وَخَرَّ رَاكِعࣰا)|(يَسْجُدُ لَهُ)|(يَخِرُّونَ لِلْأَذْقَانِ سُجَّدࣰا)|(ٱسْجُدُوا۟) لِلرَّحْمَٰنِ|ٱرْكَعُوا۟ (وَٱسْجُدُوا۟)"; // sajdapatterns.replace("\u0657", "\u08F0").replace("\u065E", "\u08F1").replace("\u0656", "\u08F2");
            var sajdaRegExpr = new RegExp(sajdapatterns, "du");
            var regexpr = new RegExp(surabismpattern, "u");
            var ratio = 0.9;
            for (var pageIndex = 0; pageIndex < 2; pageIndex++) {
                var pageNumber = pageIndex + 1;
                this.madinaLineWidths.set(pageNumber * 15 + 2, ratio * 0.5);
                this.madinaLineWidths.set(pageNumber * 15 + 3, ratio * 0.7);
                this.madinaLineWidths.set(pageNumber * 15 + 4, ratio * 0.9);
                this.madinaLineWidths.set(pageNumber * 15 + 5, ratio);
                this.madinaLineWidths.set(pageNumber * 15 + 6, ratio * 0.9);
                this.madinaLineWidths.set(pageNumber * 15 + 7, ratio * 0.7);
                this.madinaLineWidths.set(pageNumber * 15 + 8, ratio * 0.4);
            }
            this.quranInfo = [];
            for (var pageIndex = 0; pageIndex < this._quranText.length; pageIndex++) {
                var pageInfo = [];
                this.quranInfo.push(pageInfo);
                var page = this._quranText[pageIndex];
                for (var lineIndex = 0; lineIndex < page.length; lineIndex++) {
                    var line = page[lineIndex];
                    var lineInfo = {};
                    pageInfo.push(lineInfo);
                    lineInfo.lineWidthRatio = this.madinaLineWidths.get((pageIndex + 1) * 15 + lineIndex + 1) || 1;
                    lineInfo.lineType = 0;
                    var match = line.match(regexpr);
                    if (match === null || match === void 0 ? void 0 : match.groups.sura) {
                        lineInfo.lineType = 1;
                        this._outline.push({
                            name: match === null || match === void 0 ? void 0 : match.groups.sura,
                            pageIndex: pageIndex,
                            lineIndex: lineIndex
                        });
                    }
                    else if (match === null || match === void 0 ? void 0 : match.groups.bism) {
                        lineInfo.lineType = 2;
                    }
                    var sajdaMatch = line.match(sajdaRegExpr);
                    if (sajdaMatch) {
                        for (var i = 1; i < sajdaMatch.length; i++) {
                            if (sajdaMatch[i]) {
                                var pos = sajdaMatch.indices[i];
                                var startWordIndex = null;
                                var endWordIndex = null;
                                var currentWordIndex = 0;
                                for (var charIndex = 0; charIndex < line.length; charIndex++) {
                                    var char = line.charAt(charIndex);
                                    var isSpace = char === " ";
                                    if (startWordIndex == null && charIndex >= pos[0]) {
                                        startWordIndex = currentWordIndex;
                                    }
                                    if (charIndex >= pos[1]) {
                                        endWordIndex = currentWordIndex;
                                        break;
                                    }
                                    if (isSpace) {
                                        currentWordIndex++;
                                    }
                                }
                                lineInfo.sajda = { startWordIndex: startWordIndex, endWordIndex: endWordIndex };
                                this._sajsdas.push({ pageIndex: pageIndex, lineIndex: lineIndex, startWordIndex: startWordIndex, endWordIndex: endWordIndex /*, words: sajdaMatch[i]*/ });
                            }
                        }
                    }
                }
            }
            console.info("sajdasMatched=".concat(this._sajsdas.length));
            console.log("QuranTextService constructor=".concat(performance.now() - start));
        }
        QuranTextService_1.prototype.getLineInfo = function (pageIndex, lineIndex) {
            return this.quranInfo[pageIndex][lineIndex];
        };
        Object.defineProperty(QuranTextService_1.prototype, "outline", {
            get: function () {
                return this._outline;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuranTextService_1.prototype, "nbPages", {
            get: function () {
                return this._quranText.length;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuranTextService_1.prototype, "sajdas", {
            get: function () {
                return this._sajsdas;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(QuranTextService_1.prototype, "quranText", {
            get: function () {
                return this._quranText;
            },
            enumerable: false,
            configurable: true
        });
        return QuranTextService_1;
    }());
    __setFunctionName(_classThis, "QuranTextService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        QuranTextService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return QuranTextService = _classThis;
}();
exports.QuranTextService = QuranTextService;
exports.quranTextService = new QuranTextService();
//# sourceMappingURL=qurantext.service.js.map