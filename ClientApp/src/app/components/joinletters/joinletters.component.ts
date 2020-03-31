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

import { Component, AfterViewInit, OnInit, HostListener, Input, ViewChild, ElementRef } from '@angular/core';
import { QuranService } from '../../services/quranservice/quranservice.service';
import { QuranShaper } from '../../services/quranservice/quran_shaper';



@Component({
  selector: 'quran-joinletters',
  templateUrl: './joinletters.component.html',
  styleUrls: ['./joinletters.component.scss'],
})
export class JoinLettersComponent implements OnInit, AfterViewInit {
  quranShaper: QuranShaper;

  glyphNames = ['meem.init', 'meem.medi', 'meem.fina', 'hah.init', 'hah.medi', 'hah.fina', 'meem.fina.ii', 'behshape.init',
    'behshape.medi', 'behshape.fina', 'alef.fina',
    'fehshape.init', 'fehshape.medi', 'feh.fina', 'seen.init', 'seen.medi', 'seen.fina'];

  contexts = [];

  leftTatweel = 0;
  rightTatweel = 0;

  constructor(
    private quranService: QuranService,
  ) {
  }

  ngOnInit() {
    

    this.quranService.promise.then((respone: QuranShaper) => {
      this.quranShaper = respone;

      this.initCanavas();

    });

  }

  ngAfterViewInit() {
  }

  leftTatweelChanged(event) {

    this.contexts.forEach((ctx, index) => {
      this.clearCanvas(ctx);
      this.drawGlyph(ctx, this.glyphNames[index], event.value, this.rightTatweel);
    });
  }

  rightTatweelChanged(event) {

    this.contexts.forEach((ctx, index) => {
      this.clearCanvas(ctx);
      this.drawGlyph(ctx, this.glyphNames[index], this.leftTatweel, event.value);
    });
  }

  initCanavas() {

    this.contexts = [];

    this.glyphNames.forEach((item, index) => {
      var canvas = document.getElementById('jl_' + item) as any;

      const ctx = canvas.getContext('2d');

      let outputScale = this.quranService.getOutputScale(ctx);

      var wd = 60;
      var ht = 40;

      canvas.width = wd * outputScale.sx;

      canvas.height = ht * outputScale.sy;

      canvas.style.width = wd + "px";
      canvas.style.height = ht + "px";

      //ctx.translate(0, canvas.height * 2 / 3);
      //ctx.scale(0.001, 0.001);

      //let scale = canvas.width / this.pageSize.width;
      let scale = (wd / 3000) * outputScale.sx;
      ctx.transform(scale, 0, 0, -scale, 0, canvas.height * 2 / 3);

      this.clearCanvas(ctx);



      this.drawGlyph(ctx, this.glyphNames[index], this.leftTatweel, this.rightTatweel);

      this.contexts.push(ctx);
    });

  }

  clearCanvas(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Will always clear the right space
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  drawGlyph(ctx, glyphName, leftatweel, righttatweel) {

    //var code = "ignore_exp_parameters:=1;lefttatweel:=" + leftatweel + ";righttatweel:=0;";
    var code = "beginchar(testglyph,55,-1,-1,-1);";
    code = code + glyphName + "_(" + (leftatweel || 0) + "," + (righttatweel || 0) + ");";
    code = code + "endchar;";

    var status = this.quranShaper.executeMetapost(code);

    this.quranShaper.drawPathByName("testglyph", ctx);

    /*
    var path = this.quranShaper.getPathByName("testglyph");

    var draw = (new Function("return " + path))();

    draw(ctx);*/

    //var glyphCode = this.quranShaper.getGlyphCode(glyphName);

    //this.quranShaper.displayGlyph(glyphCode, 0, 0, ctx);

  }

  


  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (this.quranShaper) {
      this.initCanavas();
    }

  }



}
