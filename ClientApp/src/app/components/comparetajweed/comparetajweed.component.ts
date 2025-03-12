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

import { Component, AfterViewInit, OnInit, HostListener, Input, ViewChild, ElementRef, PipeTransform, Pipe } from '@angular/core';
import { QuranService } from '../../services/quranservice/quranservice.service';
import { QuranShaper } from '../../services/quranservice/quran_shaper';
import { Title } from '@angular/platform-browser';

import { IChange, diff } from 'json-diff-ts';

@Pipe({ name: 'split' })
export class SplitStringPipe implements PipeTransform {

  transform(value: any, args?: any): any {
    return value.split('');
  }
}

@Component({
  selector: 'quran-comparetajweed',
  templateUrl: './comparetajweed.component.html',
  styleUrls: ['./comparetajweed.component.scss'],
})
export class CompareTajweedComponent implements OnInit, AfterViewInit {
  quranShaper: QuranShaper;

  @ViewChild('file') file;
  fileIndex: number;
  files = [];
  tajweedDiffs: IChange[] = [];
  newDiffs;
  jsonFirst;
  jsonSecond;
  showByLines = false;
  showByWords = false;
  filter : any = {}

  constructor(private titleService: Title) {
    this.titleService.setTitle("Tajweed Differences");
    this.filter = { madina: true, oldmadina: true, indopak: true, words: true, lines: true };
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
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

    this.tajweedDiffs = diff(this.jsonFirst.tajweedResult, this.jsonSecond.tajweedResult);

    
    this.newDiffs = [];

    const newDiffs = this.newDiffs;    

    for (let layoutIndex = 0; layoutIndex < this.tajweedDiffs.length; layoutIndex++) {
      const words = [];
      const layoutChange = this.tajweedDiffs[layoutIndex];
      newDiffs.push({ key: layoutChange.key, changes: [], words  :[] });
      for (let pageIndex = 0; pageIndex < layoutChange.changes.length; pageIndex++) {
        const pageChange = layoutChange.changes[pageIndex];
        newDiffs[layoutIndex].changes.push({ key: pageChange.key, changes: [] });
        for (let lineIndex = 0; lineIndex < pageChange.changes.length; lineIndex++) {
          const lineChange = pageChange.changes[lineIndex];
          const changes = [];
          newDiffs[layoutIndex].changes[pageIndex].changes.push({ key: lineChange.key, changes: changes });          
          const lineText = this.jsonSecond.quranText[layoutChange.key][parseInt(pageChange.key) - 1][parseInt(lineChange.key)];
          const tajweedResult = this.jsonSecond.tajweedResult[layoutChange.key][pageChange.key][lineChange.key];          
         
          for (let charChange of lineChange.changes) {
            const charIndex = parseInt(charChange.key);
            changes[charIndex] = {
              change: charChange,
              char: lineText[charIndex]
            }
          }

          let word = [];
          let isWordChanged = false;

          for (let charindex = 0; charindex < lineText.length; charindex++) {            
            if (!changes[charindex]) {
              changes[charindex] = { char: lineText[charindex] };
            } else {
              isWordChanged = true;
            }
            if (tajweedResult[charindex]) {
              changes[charindex].tajweed = tajweedResult[charindex];
            }
            if (lineText[charindex] === " ") {
              if (isWordChanged) {
                newDiffs[layoutIndex].words.push({ page: parseInt(pageChange.key), line: parseInt(lineChange.key) + 1, change: word });
              }
              word = [];
              isWordChanged = false;
            } else {
              word.push(changes[charindex]);
            }            
          }
          if (isWordChanged) {
            newDiffs[layoutIndex].words.push({ page : pageChange.key, line : lineChange.key, change: word });
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
}
