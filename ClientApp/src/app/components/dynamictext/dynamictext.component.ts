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

import { Component, AfterViewInit, OnInit, HostListener, Input, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { QuranService } from '../../services/quranservice/quranservice.service';
import { QuranShaper } from '../../services/quranservice/quran_shaper';



@Component({
  selector: 'quran-dynamictext',
  templateUrl: './dynamictext.component.html',
  styleUrls: ['./dynamictext.component.scss'],
})
export class DynamicTextComponent implements OnInit, AfterViewInit, OnChanges {
  quranShaper: QuranShaper;

  @Input() text: string;
  @Input() min: number = 50;
  @Input() max: number = 50;
  @Input() scale: number = 1;

  private width: number;
  private height: number = 30;
  tatweel: number = 0;


  CSS_UNITS = QuranService.CSS_UNITS;

  @ViewChild("canvas", { static: true }) canvasEleRef: ElementRef<HTMLCanvasElement>;

  ctx: CanvasRenderingContext2D;

  private totalscale: number;


  constructor(
    private quranService: QuranService,
  ) {
  }

  ngOnInit() {
    this.ctx = this.canvasEleRef.nativeElement.getContext('2d');

    this.quranService.promise.then((respone: QuranShaper) => {
      this.quranShaper = respone;

      this.initCanavas();

    });

  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.quranShaper) {
      this.initCanavas();
    }
  }

  ngAfterViewInit() {
  }

  linewidthChanged(event) {
    this.drawText(event.value);
  }

  initCanavas() {

    let ctx = this.ctx;
    let canvas = this.ctx.canvas;

    this.width = this.quranShaper.shapeText(this.text, 0, 1, false, false, ctx);



    var wd = (this.width + this.max) * this.scale * this.CSS_UNITS;

    let rectifiedScale = this.scale;

    var parentWidth = this.canvasEleRef.nativeElement.offsetParent.clientWidth;

    if (wd > parentWidth) {
      rectifiedScale = this.scale * (parentWidth / wd);
      wd = parentWidth;
    }


    var hd = this.height * rectifiedScale * this.CSS_UNITS;
    canvas.style.width = wd + "px";
    canvas.style.height = hd + "px";

    let outputScale = this.quranService.getOutputScale(ctx);
    canvas.width = wd * outputScale.sx;
    canvas.height = hd * outputScale.sy;


    this.totalscale = outputScale.sx * this.CSS_UNITS * rectifiedScale;
    ctx.transform(this.totalscale, 0, 0, this.totalscale, canvas.width, canvas.height * 2 / 3);

    this.drawText(this.tatweel);

  }

  drawText(lineWidth) {

    this.quranService.clearCanvas(this.ctx);

    let width = this.width + lineWidth;

    if (width < 1) width = 1;

    this.quranShaper.shapeText(this.text, width, 1, true, true, this.ctx);

    this.drawLine();

  }

  drawLine() {
    let context = this.ctx;
    let canvas = context.canvas;

    context.beginPath();
    context.moveTo(-this.width, -this.height * 2 / 3);
    context.lineTo(-this.width, this.height);
    context.lineWidth = 1;
    // set line color
    context.strokeStyle = 'rgba(0,0,0,0.1)';
    context.stroke();
  }



  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (this.quranShaper) {
      this.initCanavas();
    }

  }



}
