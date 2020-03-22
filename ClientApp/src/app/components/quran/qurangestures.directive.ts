import { Directive, ElementRef, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[appQuranGestures]'
})
export class QuranGesturesDirective {

  @Output() toggleFullScreen: EventEmitter<any> = new EventEmitter<any>();
  private element: HTMLElement;
  stateFullScreen;  
  lastTapFullScreen;

  constructor(el: ElementRef<HTMLElement>) {

    this.element = el.nativeElement;

    this.element.addEventListener('touchstart', this.start_handler.bind(this), { passive: true });
    this.element.addEventListener('touchend', this.end_handler.bind(this), { passive: true });

    this.stateFullScreen = 0;
    this.lastTapFullScreen = 0;



  }

  start_handler(ev: TouchEvent) {

    if (ev.touches.length == 2) {
      if (this.stateFullScreen == 2) {
        var currentTime = new Date().getTime();
        var timesince = currentTime - this.lastTapFullScreen;
        if (timesince < 600) {
          this.stateFullScreen = 3;
        } else {
          this.stateFullScreen = 1;
          this.lastTapFullScreen = new Date().getTime(); 
        }
      } else {
        this.stateFullScreen = 1;
        this.lastTapFullScreen = new Date().getTime();
      }

    }
  }



  end_handler(ev) {
    if (ev.touches.length == 0) {
      if (this.stateFullScreen == 1) {
        this.stateFullScreen = 2
        return;
      } else if (this.stateFullScreen == 3) {
        this.stateFullScreen = 0;
        var currentTime = new Date().getTime();
        var timesince = currentTime - this.lastTapFullScreen;
        if (timesince < 600) {
          this.toggleFullScreen.emit();
        }
      }
      
    }
  }




}


