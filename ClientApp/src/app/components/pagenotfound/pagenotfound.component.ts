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
import { Title } from '@angular/platform-browser';
import { commonModules } from '../../app.config';



@Component({
  selector: 'quran-pagenotfound',
  templateUrl: './pagenotfound.component.html',
  styleUrls: ['./pagenotfound.component.scss'],
  imports: [...commonModules]
})
export class PageNotFoundComponent implements OnInit, AfterViewInit {
  quranShaper: QuranShaper;
  constructor(
    private quranService: QuranService, private titleService: Title
  ) {

  }

  ngOnInit() {

  }

  ngAfterViewInit() {
  }

}
