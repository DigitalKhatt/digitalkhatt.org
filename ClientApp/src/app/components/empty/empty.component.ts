import { Component, AfterViewInit, OnInit, HostListener, Input, ViewChild, ElementRef } from '@angular/core';
import { QuranService } from '../../services/quranservice/quranservice.service';
import { QuranShaper } from '../../services/quranservice/quran_shaper';
import { Title } from '@angular/platform-browser';



@Component({
  selector: 'quran-empty',
  templateUrl: './empty.component.html',
  styleUrls: ['./empty.component.scss'],
})
export class EmptyComponent implements OnInit, AfterViewInit {
  quranShaper: QuranShaper;
  constructor(
    private quranService: QuranService, private titleService: Title
  ) {
    this.titleService.setTitle("Holy Quran - DigitalKhatt");
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
  }

}
