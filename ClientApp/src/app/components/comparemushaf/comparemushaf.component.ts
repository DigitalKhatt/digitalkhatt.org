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

import { Component, AfterViewInit, OnInit, HostListener, Input, ViewChild, ElementRef, PipeTransform, Pipe, ViewChildren, QueryList } from '@angular/core';
import { QuranService } from '../../services/quranservice/quranservice.service';
import { QuranShaper } from '../../services/quranservice/quran_shaper';
import { DomSanitizer, Title } from '@angular/platform-browser';

import { IChange, diff } from 'json-diff-ts';
import { commonModules } from '../../app.config';

@Component({
  selector: 'quran-comparemushaf',
  templateUrl: './comparemushaf.component.html',
  styleUrls: ['./comparemushaf.component.scss'],
  imports: [...commonModules]
})
export class CompareMushafComponent implements OnInit, AfterViewInit {

  @ViewChildren('line') lines: QueryList<ElementRef>;

  @ViewChild('file') file;
  fileIndex: number;
  files = [];
  tajweedDiffs: IChange[] = [];
  newDiffs;
  jsonFirst;
  jsonSecond;
  showByLines = false;
  showByWords = false;
  filter: any = {}

  constructor(private titleService: Title, private sanitizer: DomSanitizer) {
    this.titleService.setTitle("Mushaf Differences");
    this.filter = { madina: true, oldmadina: true, indopak: true, words: true, lines: true };
  }

  ngOnInit() {

  }

  generateLine(lineRef) {

    const lineElem = lineRef.nativeElement;

    const glyphs = lineElem.before ? this.jsonFirst.glyphs : this.jsonSecond.glyphs;
    const pages = lineElem.before ? this.jsonFirst.pages : this.jsonSecond.pages;

    const pageIndex = parseInt(lineElem.page);
    const lineIndex = parseInt(lineElem.line);

    const diff = this.newDiffs.get(pageIndex).get(lineIndex);
    //console.log(`pageIndex=${pageIndex} lineIndex=${lineIndex} `);
    const linelayout = pages[pageIndex].lines[lineIndex];

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('shape-rendering', 'geometricPrecision');
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

    const lineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(lineGroup);

    let currentxPos = 0
    for (let glyphIndex = 0; glyphIndex < linelayout.glyphs.length; glyphIndex++) {
      const glyph = linelayout.glyphs[glyphIndex];
      currentxPos -= glyph.x_advance || 0;
      const pathString = this.getGlyphSvg(glyphs, glyph.codepoint, glyph.lefttatweel, glyph.righttatweel);
      let newpath = document.createElementNS('http://www.w3.org/2000/svg', "path");
      newpath.setAttribute("d", pathString);

      newpath.setAttribute("transform", "translate(" + (currentxPos + (glyph.x_offset || 0)) + " " + (glyph.y_offset || 0) + ")");

      if (diff.has(glyphIndex)) {
        newpath.setAttribute("fill", "red");
      }

      lineGroup.appendChild(newpath)
    }

    const xScale = 1;

    const yScale = 1;

    //console.log(`page=${this.pageIndex + 1} line=${lineIndex + 1} xScale=${xScale} yScale=${yScale} fontSizeRatio=${fontSizeRatio}`)

    const glyphScale = 20 / 1000;

    lineGroup.setAttribute("transform", "scale(" + glyphScale * xScale + "," + -glyphScale * yScale + ")");
    const margin = 20;
    const lineWidth = -glyphScale * xScale * currentxPos
    const x = lineWidth * 1.2
    let width = x + margin;


    const height = 30 * 2



    svg.setAttribute('viewBox', `${-x} ${-height / 2} ${width} ${height}`)
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.position = "relative"


    lineElem.appendChild(svg);
  }

  ngAfterViewInit() {
    this.lines.changes.subscribe(() => {

      console.log(`lines.length = ${this.lines.length} `);
      for (let lineRef of this.lines) {
        this.generateLine(lineRef);
      }
    });
  }

  addUpload(fileIndex) {
    this.fileIndex = fileIndex;
    this.file.nativeElement.click();
  }
  onUpload(event) {

    let fileList: FileList = event.target.files;


    if (fileList.length > 0) {
      let file: File = fileList[0];

      var reader = new FileReader();
      reader.onload = (e) => {
        let result: string = reader.result as string;

        try {
          const json = JSON.parse(result);
          this.files[this.fileIndex] = { json, fileName: file.name };

        } catch {

        }

      };

      reader.readAsText(file);


    }

    event.target.value = "";


  }

  compareTajweed() {

    const t0 = performance.now();

    this.jsonFirst = this.files[0].json;
    this.jsonSecond = this.files[1].json;

    const glyphDifferences = diff(this.jsonFirst.glyphs, this.jsonSecond.glyphs);
    const layoutDifferences = diff(this.jsonFirst.pages, this.jsonSecond.pages);

    const pages = new Map();

    this.newDiffs = pages;

    if (layoutDifferences.length > 0) {
      const pagesChange = layoutDifferences[0].changes;
      for (let pageChangeIndex = 0; pageChangeIndex < pagesChange.length; pageChangeIndex++) {
        const pageChange = pagesChange[pageChangeIndex];
        const pageIndex = parseInt(pageChange.key);
        const lines = new Map();
        pages.set(pageIndex, lines);
        const linesChange = pageChange.changes[0].changes;
        for (let lineChangeIndex = 0; lineChangeIndex < linesChange.length; lineChangeIndex++) {
          const lineChange = linesChange[lineChangeIndex];
          const lineIndex = parseInt(lineChange.key);
          const glyphs = new Map();
          lines.set(lineIndex, glyphs);
          const glyphsChange = lineChange.changes[0].changes;
          for (let glyphChangeIndex = 0; glyphChangeIndex < glyphsChange.length; glyphChangeIndex++) {
            const glyphChange = glyphsChange[glyphChangeIndex];
            const glyphIndex = parseInt(glyphChange.key);
            glyphs.set(glyphIndex, glyphChange);
          }
        }

      }
    }

    const t1 = performance.now();

    console.log(`compareTajweed takes ${t1 - t0}`);

  }

  getStyle(layoutIndex, pageIndex, lineIndex, charIndex, before: boolean) {
    const layout = this.tajweedDiffs[layoutIndex];
    const pageChange = layout.changes[pageIndex];
    const lineChange = pageChange.changes[lineIndex];
    const lineText = this.jsonSecond.quranText[layout.key][parseInt(pageChange.key) - 1][parseInt(lineChange.key)];

    for (let change of lineChange.changes) {

      if (parseInt(change.key) === charIndex) {
        if (change.type === "UPDATE") {
          return "rgba(0, 0, 255, 0.1)";
        } else if (change.type === "ADD") {
          if (!before) {
            return "rgba(0, 255, 0, 0.1)";
          } else {
            return null;
          }
        } else if (before) {
          return "rgba(255, 0, 0, 0.1)";
        } else {
          return null;
        }
      }
    }
    return null;
  }

  getStyle2(change, before: boolean, after: boolean) {

    if (!change) return null;

    if (change.type === "UPDATE") {
      return "rgba(0, 0, 255, 0.1)";
    } else if (change.type === "ADD") {
      if (after) {
        return "rgba(0, 255, 0, 0.1)";
      } else {
        return null;
      }
    } else if (before) {
      return "rgba(255, 0, 0, 0.1)";
    } else {
      return null;
    }
  }

  getClass2(change, before: boolean, after: boolean) {

    if (!change) return null;

    if (change.type === "UPDATE") {
      return after ? change.value : change.oldValue;
    } else if (change.type === "ADD") {
      if (after) {
        return change.value;
      } else {
        return null;
      }
    } else if (before) {
      return change.value;
    } else {
      return null;
    }
  }


  getClass(layoutIndex, pageIndex, lineIndex, charIndex, before: boolean) {
    const layout = this.tajweedDiffs[layoutIndex];
    const pageChange = layout.changes[pageIndex];
    const lineChange = pageChange.changes[lineIndex];

    for (let change of lineChange.changes) {
      if (parseInt(change.key) === charIndex) {
        if (change.type === "UPDATE") {
          return before ? change.oldValue : change.value;
        } else if (change.type === "ADD") {
          if (!before) {
            return change.value;
          } else {
            return null;
          }
        } else if (before) {
          return change.value;
        } else {
          return null;
        }
      }
    }
    return null;
  }
  getClassFinal(layout, pageNumber, lineIndex, charIndex) {
    const lineText = this.jsonSecond.quranText[layout][pageNumber][lineIndex];
    const tajweedResult = this.jsonSecond.tajweedResult[layout][pageNumber][lineIndex];

    for (let key in tajweedResult) {
      if (parseInt(key) === charIndex) {
        return tajweedResult[key];
      }
    }
    return null;
  }



  getFontFamily(layout) {
    return layout === "NewMadinah" ? 'madina' : layout === "OldMadinah" ? 'oldmadina' : 'indopak';
  }

  showWord(word) {
    alert(`page = ${word.page} line=${word.line}`)
  }

  showLayout(layoutName: string) {
    if (layoutName === "NewMadinah") {
      return this.filter.madina
    } else if (layoutName === "OldMadinah") {
      return this.filter.oldmadina
    } else if (layoutName === "IndoPak15Lines") {
      return this.filter.indopak
    } else {
      return true;
    }

  }

  getGlyphSvg(glyphs: any[], codepoint: number, lefttatweel: number, righttatweel: number) {

    let svg: string = "";

    const glyphInfo = glyphs[codepoint];
    const limits = glyphInfo.limits || [0, 0, 0, 0];
    if (lefttatweel < limits[0]) {
      lefttatweel = limits[0];
    }
    if (lefttatweel > limits[1]) {
      lefttatweel = limits[1];
    }
    if (righttatweel < limits[2]) {
      righttatweel = limits[2];
    }
    if (righttatweel > limits[3]) {
      righttatweel = limits[3];
    }

    let leftScalar = 0;
    if (lefttatweel < 0) {
      leftScalar = lefttatweel / limits[0];
    } else if (lefttatweel > 0) {
      leftScalar = lefttatweel / limits[1];
    }
    let rightScalar = 0;
    if (righttatweel < 0) {
      rightScalar = righttatweel / limits[2];
    } else if (righttatweel > 0) {
      rightScalar = righttatweel / limits[3];
    }

    function interpolate(value, i, j, k) {
      let interpolatedValue = value;
      if (lefttatweel < 0) {
        interpolatedValue += (glyphInfo.minLeft[i].path[j][k] - value) * leftScalar;
      } else if (lefttatweel > 0) {
        interpolatedValue += (glyphInfo.maxLeft[i].path[j][k] - value) * leftScalar;
      }
      if (righttatweel < 0) {
        interpolatedValue += (glyphInfo.minRight[i].path[j][k] - value) * rightScalar;
      } else if (righttatweel > 0) {
        interpolatedValue += (glyphInfo.maxRight[i].path[j][k] - value) * rightScalar;
      }

      return interpolatedValue;

    }

    let pathd: string = "";
    for (let i = 0; i < glyphInfo.default.length; i++) {
      const defaultPath = glyphInfo.default[i];
      /*const withColor = defaultPath.color && (defaultPath.color[0] !== 0 || defaultPath.color[1] !== 0 || defaultPath.color[2] !== 0);
      if (withColor && i > 0) {
        svg += `<path d=${pathd} />`;
        pathd = "";
      }*/
      for (let j = 0; j < defaultPath.path.length; j++) {
        const element = defaultPath.path[j];
        if (element.length === 2) {
          pathd += `M${interpolate(element[0], i, j, 0)} ${interpolate(element[1], i, j, 1)}`;
          //ctx.moveTo(interpolate(element[0], i, j, 0), interpolate(element[1], i, j, 1));
        } else if (element.length === 6) {
          pathd += `C${interpolate(element[0], i, j, 0)} ${interpolate(element[1], i, j, 1)},${interpolate(element[2], i, j, 2)} ${interpolate(element[3], i, j, 3)},${interpolate(element[4], i, j, 4)} ${interpolate(element[5], i, j, 5)}`;
        }
      }

      /*if (withColor) {
        const color = defaultPath.color || [0, 0, 0];        
        const style = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
        svg += `<path d=${pathd} fill=${style}/>`;        
        pathd = "";
      }*/
    }
    //svg += `<path d=${pathd} />`;

    return pathd;
  }
}
