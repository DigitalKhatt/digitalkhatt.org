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

import { Directive, ElementRef, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

@Directive({
    selector: '[appQuranZoom]',
    standalone: false
})
export class QuranZoomDirective implements OnInit, OnDestroy {

  private evCache : PointerEvent[]= new Array();
  private prevDiff = -1;
  private element: HTMLElement;

  @Output() zoom: EventEmitter<any> = new EventEmitter<any>();

  constructor(el: ElementRef) {

    this.element = el.nativeElement;

  }

  ngOnInit() {
    this.element.onpointerdown = this.pointerdown_handler.bind(this);
    this.element.onpointermove = this.pointermove_handler.bind(this);

    // Use same handler for pointer{up,cancel,out,leave} events since
    // the semantics for these events - in this app - are the same.

    this.element.onpointerup = this.pointerup_handler.bind(this);
    this.element.onpointercancel = this.pointerup_handler.bind(this);
    this.element.onpointerout = this.pointerup_handler.bind(this);
    this.element.onpointerleave = this.pointerup_handler.bind(this);
  }

  ngOnDestroy() {

  }

  pointerdown_handler(ev) {
    // The pointerdown event signals the start of a touch interaction.
    // This event is cached to support 2-finger gestures
    this.evCache.push(ev);
    
  }

  pointermove_handler(ev) {
    // This function implements a 2-pointer horizontal pinch/zoom gesture. 
    //
    // If the distance between the two pointers has increased (zoom in), 
    // the taget element's background is changed to "pink" and if the 
    // distance is decreasing (zoom out), the color is changed to "lightblue".
    //
    // This function sets the target element's border to "dashed" to visually
    // indicate the pointer's target received a move event.
    //console.log("pointerMove", ev);


    // Find this event in the cache and update its record with this event
    for (var i = 0; i < this.evCache.length; i++) {
      if (ev.pointerId == this.evCache[i].pointerId) {
        this.evCache[i] = ev;
        break;
      }
    }

    // If two pointers are down, check for pinch gestures
    if (this.evCache.length == 2) {
      // Calculate the distance between the two pointers
      var curDiff = Math.hypot(
        this.evCache[0].clientX - this.evCache[1].clientX,
        this.evCache[0].clientY - this.evCache[1].clientY)

      //var curDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);

      if (this.prevDiff > 0) {
        if (curDiff > this.prevDiff) {
          // The distance between the two pointers has increased
          console.log("Pinch moving OUT -> Zoom in", ev);
          this.zoom.emit(curDiff - this.prevDiff);
        }
        if (curDiff < this.prevDiff) {
          // The distance between the two pointers has decreased
          console.log("Pinch moving IN -> Zoom out", ev);
          this.zoom.emit(curDiff - this.prevDiff);
        }
      }

      // Cache the distance for the next move event 
      this.prevDiff = curDiff;
    }

  }

  pointerup_handler(ev) {
    // Remove this pointer from the cache and reset the target's
    // background and border
    this.remove_event(ev);

    // If the number of pointers down is less than two then reset diff tracker
    if (this.evCache.length < 2) {
      this.prevDiff = -1;
      this.evCache = new Array();
    }
  }

  remove_event(ev) {
    // Remove this event from the target's cache
    for (var i = 0; i < this.evCache.length; i++) {
      if (this.evCache[i].pointerId == ev.pointerId) {
        this.evCache.splice(i, 1);
        break;
      }
    }
  }

}


