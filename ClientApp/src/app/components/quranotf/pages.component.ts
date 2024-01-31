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

import { Component, AfterViewInit, OnInit, ViewChildren, QueryList, ElementRef} from '@angular/core';
import { QuranService } from '../../services/quranservice/quranservice.service';
import { QuranShaper } from '../../services/quranservice/quran_shaper';



@Component({
  selector: 'quran-pages',
  templateUrl: './pages.component.ts.html',
  styleUrls: ['./pages.component.ts.scss'],
  host: { 'class': 'digitalkhatt' }
})
export class QuranPagesComponent implements OnInit, AfterViewInit {
  

  @ViewChildren('page') pageElements: QueryList<ElementRef>;
 

  constructor(
    private quranService: QuranService,
  ) {
  }

  ngOnInit() {    

  }

  ngAfterViewInit() {
    //let ii = this.pageElements;
  }


  



}
