"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hb_tag = exports.loadAndCacheFont = exports.loadHarfbuzz = exports.harfbuzzFonts = exports.getWidth = exports.shape = exports.HarfBuzzBuffer = exports.HarfBuzzFont = exports.HarfBuzzFace = exports.HarfBuzzBlob = exports.hb = void 0;
var HB_MEMORY_MODE_WRITABLE = 2;
var HB_SET_VALUE_INVALID = -1;
var HarfBuzzExports = /** @class */ (function () {
    function HarfBuzzExports(exports) {
        this.exports = exports;
        this.pathBufferSize = 65536; // should be enough for most glyphs
        this.utf8Decoder = new TextDecoder("utf8");
        this.heapu8 = new Uint8Array(exports.memory.buffer);
        this.heapu32 = new Uint32Array(exports.memory.buffer);
        this.heapi32 = new Int32Array(exports.memory.buffer);
        this.utf8Encoder = new TextEncoder();
        this.malloc = exports.malloc;
        this.free = exports.free;
        this.free_ptr = exports.free_ptr;
        this.hb_blob_destroy = exports.hb_blob_destroy;
        this.hb_blob_create = exports.hb_blob_create;
        this.hb_face_create = exports.hb_face_create;
        this.hb_face_get_upem = exports.hb_face_get_upem;
        this.hb_face_destroy = exports.hb_face_destroy;
        this.hb_face_collect_unicodes = exports.hb_face_collect_unicodes;
        this.hb_set_create = exports.hb_set_create;
        this.hb_set_destroy = exports.hb_set_destroy;
        this.hb_set_get_population = exports.hb_set_get_population;
        this.hb_set_next_many = exports.hb_set_next_many;
        this.hb_font_create = exports.hb_font_create;
        this.hb_font_set_scale = exports.hb_font_set_scale;
        this.hb_font_destroy = exports.hb_font_destroy;
        this.hb_buffer_create = exports.hb_buffer_create;
        this.hb_buffer_add_utf8 = exports.hb_buffer_add_utf8;
        this.hb_buffer_guess_segment_properties = exports.hb_buffer_guess_segment_properties;
        this.hb_buffer_set_direction = exports.hb_buffer_set_direction;
        this.hb_shape = exports.hb_shape;
        this.hb_buffer_get_length = exports.hb_buffer_get_length;
        this.hb_buffer_get_glyph_infos = exports.hb_buffer_get_glyph_infos;
        this.hb_buffer_get_glyph_positions = exports.hb_buffer_get_glyph_positions;
        this.hb_buffer_destroy = exports.hb_buffer_destroy;
        var str = this.createAsciiString('Arab');
        this.arabScript = this.exports.hb_script_from_string(str.ptr, -1);
        str.free();
        str = this.createAsciiString('ar');
        this.arabLanguage = this.exports.hb_language_from_string(str.ptr, -1);
        str.free();
        this.pathBuffer = this.malloc(this.pathBufferSize);
    }
    HarfBuzzExports.prototype.createAsciiString = function (text) {
        var _this = this;
        var ptr = this.malloc(text.length + 1);
        for (var i = 0; i < text.length; ++i) {
            var char = text.charCodeAt(i);
            if (char > 127)
                throw new Error('Expected ASCII text');
            this.heapu8[ptr + i] = char;
        }
        this.heapu8[ptr + text.length] = 0;
        return {
            ptr: ptr,
            length: text.length,
            free: function () { _this.free(ptr); }
        };
    };
    HarfBuzzExports.prototype.createJsString = function (text) {
        var _this = this;
        var ptr = this.exports.malloc(text.length * 2);
        var words = new Uint16Array(this.exports.memory.buffer, ptr, text.length);
        for (var i = 0; i < words.length; ++i)
            words[i] = text.charCodeAt(i);
        return {
            ptr: ptr,
            length: words.length,
            free: function () { _this.exports.free(ptr); }
        };
    };
    HarfBuzzExports.prototype.createFeatures = function (features) {
        var _this = this;
        if (!(features === null || features === void 0 ? void 0 : features.length)) {
            return {
                ptr: 0,
                length: 0,
                free: function () { }
            };
        }
        var ptr = this.exports.malloc(16 * features.length);
        for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            this.heapu32[ptr / 4 + i * 4 + 0] = hb_tag(feature.tag);
            this.heapu32[ptr / 4 + i * 4 + 1] = feature.value;
            this.heapu32[ptr / 4 + i * 4 + 2] = feature.start;
            this.heapu32[ptr / 4 + i * 4 + 3] = feature.end;
        }
        return {
            ptr: ptr,
            length: features.length,
            free: function () { _this.exports.free(ptr); }
        };
    };
    return HarfBuzzExports;
}());
var CString = /** @class */ (function () {
    function CString(text) {
        var bytes = exports.hb.utf8Encoder.encode(text);
        this.ptr = exports.hb.malloc(bytes.byteLength);
        exports.hb.heapu8.set(bytes, this.ptr);
        this.length = bytes.byteLength;
    }
    CString.prototype.destroy = function () {
        exports.hb.free(this.ptr);
    };
    return CString;
}());
var HarfBuzzBlob = /** @class */ (function () {
    function HarfBuzzBlob(data) {
        var blobPtr = exports.hb.malloc(data.length);
        exports.hb.heapu8.set(data, blobPtr);
        this.ptr = exports.hb.hb_blob_create(blobPtr, data.byteLength, HB_MEMORY_MODE_WRITABLE, blobPtr, exports.hb.free_ptr());
    }
    HarfBuzzBlob.prototype.destroy = function () {
        exports.hb.hb_blob_destroy(this.ptr);
    };
    return HarfBuzzBlob;
}());
exports.HarfBuzzBlob = HarfBuzzBlob;
function typedArrayFromSet(setPtr, arrayType) {
    var heap = exports.hb["heap".concat(arrayType)];
    var bytesPerElment = heap.BYTES_PER_ELEMENT;
    var setCount = exports.hb.hb_set_get_population(setPtr);
    var arrayPtr = exports.hb.malloc(setCount * bytesPerElment);
    var arrayOffset = arrayPtr / bytesPerElment;
    var array = heap.subarray(arrayOffset, arrayOffset + setCount);
    heap.set(array, arrayOffset);
    exports.hb.hb_set_next_many(setPtr, HB_SET_VALUE_INVALID, arrayPtr, setCount);
    return array;
}
var HarfBuzzFace = /** @class */ (function () {
    function HarfBuzzFace(blob, index) {
        this.ptr = exports.hb.hb_face_create(blob.ptr, index);
    }
    HarfBuzzFace.prototype.getUnitsPerEM = function () {
        return exports.hb.hb_face_get_upem(this.ptr);
    };
    HarfBuzzFace.prototype.collectUnicodes = function () {
        var unicodeSetPtr = exports.hb.hb_set_create();
        exports.hb.hb_face_collect_unicodes(this.ptr, unicodeSetPtr);
        var result = typedArrayFromSet(unicodeSetPtr, 'u32');
        exports.hb.hb_set_destroy(unicodeSetPtr);
        return result;
    };
    HarfBuzzFace.prototype.destroy = function () {
        exports.hb.hb_face_destroy(this.ptr);
    };
    return HarfBuzzFace;
}());
exports.HarfBuzzFace = HarfBuzzFace;
var HarfBuzzFont = /** @class */ (function () {
    function HarfBuzzFont(face) {
        this.ptr = exports.hb.hb_font_create(face.ptr);
        this.unitsPerEM = face.getUnitsPerEM();
    }
    HarfBuzzFont.prototype.setScale = function (xScale, yScale) {
        exports.hb.hb_font_set_scale(this.ptr, xScale, yScale);
    };
    HarfBuzzFont.prototype.glyphToSvgPath = function (glyphId) {
        var svgLength = exports.hb.exports.hbjs_glyph_svg(this.ptr, glyphId, exports.hb.pathBuffer, exports.hb.pathBufferSize);
        return svgLength > 0 ? exports.hb.utf8Decoder.decode(exports.hb.heapu8.subarray(exports.hb.pathBuffer, exports.hb.pathBuffer + svgLength)) : "";
    };
    HarfBuzzFont.prototype.destroy = function () {
        exports.hb.hb_font_destroy(this.ptr);
    };
    return HarfBuzzFont;
}());
exports.HarfBuzzFont = HarfBuzzFont;
var GlyphInformation = /** @class */ (function () {
    function GlyphInformation(glyphId, cluster, xAdvance, yAdvance, xOffset, yOffset) {
        this.GlyphId = glyphId;
        this.Cluster = cluster;
        this.XAdvance = xAdvance;
        this.YAdvance = yAdvance;
        this.XOffset = xOffset;
        this.YOffset = yOffset;
    }
    return GlyphInformation;
}());
var HarfBuzzBuffer = /** @class */ (function () {
    function HarfBuzzBuffer() {
        this.ptr = exports.hb.hb_buffer_create();
    }
    HarfBuzzBuffer.prototype.addUtf8Text = function (text) {
        var str = new CString(text);
        exports.hb.hb_buffer_add_utf8(this.ptr, str.ptr, str.length, 0, str.length);
        str.destroy();
    };
    HarfBuzzBuffer.prototype.addText = function (text) {
        var str = exports.hb.createJsString(text);
        exports.hb.exports.hb_buffer_add_utf16(this.ptr, str.ptr, str.length, 0, str.length);
        str.free();
    };
    HarfBuzzBuffer.prototype.guessSegmentProperties = function () {
        exports.hb.hb_buffer_guess_segment_properties(this.ptr);
    };
    HarfBuzzBuffer.prototype.setDirection = function (direction) {
        var d = { "ltr": 4, "rtl": 5, "ttb": 6, "btt": 7 }[direction];
        exports.hb.hb_buffer_set_direction(this.ptr, d);
    };
    HarfBuzzBuffer.prototype.setLanguageFromString = function (language) {
        var str = exports.hb.createAsciiString(language);
        exports.hb.exports.hb_buffer_set_language(this.ptr, exports.hb.exports.hb_language_from_string(str.ptr, -1));
        str.free();
    };
    HarfBuzzBuffer.prototype.setScriptFromString = function (script) {
        var str = exports.hb.createAsciiString(script);
        exports.hb.exports.hb_buffer_set_script(this.ptr, exports.hb.exports.hb_script_from_string(str.ptr, -1));
        str.free();
    };
    HarfBuzzBuffer.prototype.setLanguage = function (language) {
        exports.hb.exports.hb_buffer_set_language(this.ptr, language);
    };
    HarfBuzzBuffer.prototype.setScript = function (script) {
        exports.hb.exports.hb_buffer_set_script(this.ptr, script);
    };
    HarfBuzzBuffer.prototype.setClusterLevel = function (level) {
        exports.hb.exports.hb_buffer_set_cluster_level(this.ptr, level);
    };
    HarfBuzzBuffer.prototype.shape = function (font, features) {
        var feats = exports.hb.createFeatures(features);
        exports.hb.hb_shape(font.ptr, this.ptr, feats.ptr, feats.length);
        feats.free();
        return this.json();
    };
    HarfBuzzBuffer.prototype.json = function () {
        var length = exports.hb.hb_buffer_get_length(this.ptr);
        var result = new Array();
        var infosPtr32 = exports.hb.hb_buffer_get_glyph_infos(this.ptr, 0) / 4;
        var positionsPtr32 = exports.hb.hb_buffer_get_glyph_positions(this.ptr, 0) / 4;
        var infos = exports.hb.heapu32.subarray(infosPtr32, infosPtr32 + 5 * length);
        var positions = exports.hb.heapi32.subarray(positionsPtr32, positionsPtr32 + 5 * length);
        for (var i = 0; i < length; ++i) {
            result.push(new GlyphInformation(infos[i * 5 + 0], infos[i * 5 + 2], positions[i * 5 + 0], positions[i * 5 + 1], positions[i * 5 + 2], positions[i * 5 + 3]));
        }
        return result;
    };
    HarfBuzzBuffer.prototype.destroy = function () {
        exports.hb.hb_buffer_destroy(this.ptr);
    };
    return HarfBuzzBuffer;
}());
exports.HarfBuzzBuffer = HarfBuzzBuffer;
function shape(text, font, features) {
    var buffer = new HarfBuzzBuffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    buffer.shape(font, features);
    var result = buffer.json();
    buffer.destroy();
    return result;
}
exports.shape = shape;
function getWidth(text, font, fontSizeInPixel, features) {
    var scale = fontSizeInPixel / font.unitsPerEM;
    var shapeResult = shape(text, font, features);
    var totalWidth = 0.0;
    for (var _i = 0, shapeResult_1 = shapeResult; _i < shapeResult_1.length; _i++) {
        var glyphInformation = shapeResult_1[_i];
        totalWidth += glyphInformation.XAdvance;
    }
    return totalWidth * scale;
}
exports.getWidth = getWidth;
exports.harfbuzzFonts = new Map();
function loadHarfbuzz(webAssemblyUrl) {
    return fetch(webAssemblyUrl).then(function (response) {
        return response.arrayBuffer();
    }).then(function (wasm) {
        return WebAssembly.instantiate(wasm);
    }).then(function (result) {
        //@ts-ignore
        exports.hb = new HarfBuzzExports(result.instance.exports);
    });
}
exports.loadHarfbuzz = loadHarfbuzz;
function loadAndCacheFont(fontName, fontUrl) {
    return fetch(fontUrl).then(function (response) {
        return response.arrayBuffer().then(function (blob) {
            var fontBlob = new Uint8Array(blob);
            var harfbuzzBlob = new HarfBuzzBlob(fontBlob);
            var harfbuzzFace = new HarfBuzzFace(harfbuzzBlob, 0);
            var harfbuzzFont = new HarfBuzzFont(harfbuzzFace);
            exports.harfbuzzFonts.set(fontName, harfbuzzFont);
            harfbuzzFace.destroy();
            harfbuzzBlob.destroy();
        });
    });
}
exports.loadAndCacheFont = loadAndCacheFont;
function hb_tag(s) {
    return ((s.charCodeAt(0) & 0xFF) << 24 |
        (s.charCodeAt(1) & 0xFF) << 16 |
        (s.charCodeAt(2) & 0xFF) << 8 |
        (s.charCodeAt(3) & 0xFF) << 0);
}
exports.hb_tag = hb_tag;
//# sourceMappingURL=harfbuzz.js.map