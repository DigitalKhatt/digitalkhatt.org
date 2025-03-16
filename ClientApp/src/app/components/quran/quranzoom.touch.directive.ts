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

import { Directive, ElementRef, Output, EventEmitter } from '@angular/core';

@Directive({
    selector: '[appQuranTouchZoom]',
    standalone: false
})
export class QuranZoomTouchDirective {

  tpCache = new Array();
  element: HTMLElement;
  private prevDist = -1;
  private startDist = -1;
  private clientX = 0;
  private clientY = 0;
  private zoomed: boolean;

  @Output() zoom: EventEmitter<any> = new EventEmitter<any>();
  @Output() endzoom: EventEmitter<any> = new EventEmitter<any>();

  constructor(el: ElementRef<HTMLElement>) {

    this.element = el.nativeElement;

    this.element.addEventListener('touchstart', this.start_handler.bind(this), { passive: true });
    this.element.addEventListener('touchmove', this.move_handler.bind(this), { passive: true });
    this.element.addEventListener('touchcancel', this.end_handler.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.end_handler.bind(this), { passive: false });

    this.zoomed = false;

  }

  start_handler(ev: TouchEvent) {

    if (ev.touches.length == 2) {
      var x = ev.touches[1].clientX - ev.touches[0].clientX;
      var y = ev.touches[1].clientY - ev.touches[0].clientY;
      this.startDist = Math.sqrt(x * x + y * y);
      this.prevDist = this.startDist;
      this.tpCache = new Array();
      this.zoomed = false;
      for (var i = 0; i < ev.touches.length; i++) {
        this.tpCache.push(ev.touches[i]);
      }

      this.clientX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
      this.clientY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
    }
  }

  move_handler(ev) {

    // Check this event for 2-touch Move/Pinch/Zoom gesture
    this.handle_pinch_zoom(ev);
  }
  handle_pinch_zoom(ev) {

    if (ev.touches.length == 2) {
      // Check if the two target touches are the same ones that started
      // the 2-touch
      var point1 = -1, point2 = -1;
      for (var i = 0; i < this.tpCache.length; i++) {
        if (this.tpCache[i].identifier == ev.touches[0].identifier) point1 = i;
        if (this.tpCache[i].identifier == ev.touches[1].identifier) point2 = i;
      }
      if (point1 >= 0 && point2 >= 0) {

        // Calculate the distance between the two pointers
        var curDist = Math.hypot(
          ev.touches[0].clientX - ev.touches[1].clientX,
          ev.touches[0].clientY - ev.touches[1].clientY);


        this.zoom.emit({
          clientX: this.clientX,
          clientY: this.clientY,
          scale: curDist / this.prevDist
        });

        this.zoomed = true;


        // Cache the distance for the next move event 
        this.prevDist = curDist;
      }
    }
  }

  end_handler(ev) {
    ev.preventDefault();
    if (this.zoomed && ev.touches.length < 2) {
      this.endzoom.emit();
      this.zoomed = false;
    }
    
  }


}


