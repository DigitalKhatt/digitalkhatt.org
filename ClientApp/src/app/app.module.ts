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

import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { HttpClientModule } from '@angular/common/http';
import { Injectable, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule, HammerGestureConfig } from '@angular/platform-browser';
import { ExtraOptions, RouteReuseStrategy, RouterModule } from '@angular/router';

import { AppComponent } from './app.component';

import { QuranService } from './services/quranservice/quranservice.service';

//import { ScrollingModule, ScrollDispatchModule } from '@angular/cdk/scrolling';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PortalModule } from '@angular/cdk/portal';
import { CustomIconRegistry, SVG_ICONS } from 'src/app/shared/custom-icon-registry';
import { QuranComponent } from './components/quran/quran.component';
import { SidebarContentsService } from './services/navigation/sidebarcontents';

import { environment } from '../environments/environment';

//import * as Hammer from 'hammerjs';
import { AboutComponent } from './components/about/about.component';
import { DynamicTextComponent } from './components/dynamictext/dynamictext.component';
import { EmptyComponent } from './components/empty/empty.component';
import { JoinLettersComponent } from './components/joinletters/joinletters.component';
import { QuranGesturesDirective } from './components/quran/qurangestures.directive';
import { QuranZoomDirective } from './components/quran/quranzoom.directive';
import { QuranZoomTouchDirective } from './components/quran/quranzoom.touch.directive';
import { QuranPagesComponent } from './components/quranotf/pages.component';
import { QuranOTFComponent } from './components/quranotf/quranotf.component';
import { CacheRouteReuseStrategy } from './services/cache-route-reuse.strategy';
//import { QuranCanvasComponent } from './components/qurancanvas/qurancanvas.component';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { ServiceWorkerModule } from '@angular/service-worker';
import { HBMedinaComponent } from './components/hbmedina/hbmedina.component';
import { OldMedinaComponent } from './components/oldmedina/oldmedina.component';
import { LayoutService } from './services/layoutservice/layoutservice.service';
import { PageNotFoundComponent } from './components/pagenotfound/pagenotfound.component';
import { CompareTajweedComponent, SplitStringPipe } from './components/comparetajweed/comparetajweed.component';
import { MUSHAFLAYOUTTYPE, MushafLayoutType } from './services/qurantext.service';
import { CompareMushafComponent } from './components/comparemushaf/comparemushaf.component';
//import { DragDropModule } from '@angular/cdk/drag-drop';



/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 * The piece of code below is part of Angular (https://github.com/angular/angular/blob/master/aio/src/app/app.module.ts)
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const svgIconProviders = [
  {
    provide: SVG_ICONS,
    useValue: {
      name: 'menu',
      svgSource:
        '<svg focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />' +
        '</svg>',
    },
    multi: true,
  },
  {
    provide: SVG_ICONS,
    useValue: {
      namespace: 'logos',
      name: 'github',
      svgSource:
        '<svg focusable="false" viewBox="0 0 51.8 50.4" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M25.9,0.2C11.8,0.2,0.3,11.7,0.3,25.8c0,11.3,7.3,20.9,17.5,24.3c1.3,0.2,1.7-0.6,1.7-1.2c0-0.6,0-2.6,0-4.8' +
        'c-7.1,1.5-8.6-3-8.6-3c-1.2-3-2.8-3.7-2.8-3.7c-2.3-1.6,0.2-1.6,0.2-1.6c2.6,0.2,3.9,2.6,3.9,2.6c2.3,3.9,6,2.8,7.5,2.1' +
        'c0.2-1.7,0.9-2.8,1.6-3.4c-5.7-0.6-11.7-2.8-11.7-12.7c0-2.8,1-5.1,2.6-6.9c-0.3-0.7-1.1-3.3,0.3-6.8c0,0,2.1-0.7,7,2.6' +
        'c2-0.6,4.2-0.9,6.4-0.9c2.2,0,4.4,0.3,6.4,0.9c4.9-3.3,7-2.6,7-2.6c1.4,3.5,0.5,6.1,0.3,6.8c1.6,1.8,2.6,4.1,2.6,6.9' +
        'c0,9.8-6,12-11.7,12.6c0.9,0.8,1.7,2.4,1.7,4.7c0,3.4,0,6.2,0,7c0,0.7,0.5,1.5,1.8,1.2c10.2-3.4,17.5-13,17.5-24.3' +
        'C51.5,11.7,40.1,0.2,25.9,0.2z" />' +
        '</svg>',
    },
    multi: true,
  },
  {
    provide: SVG_ICONS,
    useValue: {
      namespace: 'logos',
      name: 'twitter',
      svgSource:
        '<svg focusable="false" viewBox="0 0 50 59" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M50,9.3c-1.8,0.8-3.8,1.4-5.9,1.6c2.1-1.3,3.7-3.3,4.5-5.7c-2,1.2-4.2,2-6.5,2.5c-1.9-2-4.5-3.2-7.5-3.2' +
        'c-5.7,0-10.3,4.6-10.3,10.3c0,0.8,0.1,1.6,0.3,2.3C16.1,16.7,8.5,12.6,3.5,6.4c-0.9,1.5-1.4,3.3-1.4,5.2c0,3.6,1.8,6.7,4.6,8.5' +
        'C5,20,3.4,19.6,2,18.8c0,0,0,0.1,0,0.1c0,5,3.5,9.1,8.2,10.1c-0.9,0.2-1.8,0.4-2.7,0.4c-0.7,0-1.3-0.1-1.9-0.2' +
        'c1.3,4.1,5.1,7,9.6,7.1c-3.5,2.8-7.9,4.4-12.7,4.4c-0.8,0-1.6,0-2.4-0.1c4.5,2.9,9.9,4.6,15.7,4.6c18.9,0,29.2-15.6,29.2-29.2' +
        'c0-0.4,0-0.9,0-1.3C46.9,13.2,48.6,11.4,50,9.3z" />' +
        '</svg>',
    },
    multi: true,
  },
];

@Injectable()
export class MyHammerConfig extends HammerGestureConfig {

  public options = {
    touchAction: 'pan-y | pan-x',
    domEvents: true,
  }
  /*
  public overrides = {
    pan: { direction: Hammer.DIRECTION_ALL },
    swipe: { direction: Hammer.DIRECTION_ALL },
  };*/

  /*
  buildHammer(element: HTMLElement) {
    const mc = new Hammer(element, {
      touchAction: 'pan-y | pan-x'
    });

    return mc;
  }*/
}

const routerOptions: ExtraOptions = {
    anchorScrolling: 'enabled'
};

@NgModule({
  declarations: [
    AppComponent,
    AboutComponent,
    //NavMenuComponent,
    QuranComponent,
    QuranZoomDirective,
    QuranZoomTouchDirective,
    QuranGesturesDirective,
    DynamicTextComponent,
    JoinLettersComponent,
    EmptyComponent,
    QuranOTFComponent,
    QuranPagesComponent,
    OldMedinaComponent,
    HBMedinaComponent,
    PageNotFoundComponent,
    CompareTajweedComponent,
    CompareMushafComponent,
    SplitStringPipe
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
    HttpClientModule,
    FormsModule, ReactiveFormsModule,
    ScrollingModule,
    DragDropModule,
    MatToolbarModule, MatButtonModule, MatSliderModule, MatCardModule, MatIconModule, MatSidenavModule, PortalModule,
    MatSlideToggleModule, MatInputModule, MatAutocompleteModule, MatDividerModule, MatSelectModule, MatRadioModule, MatCheckboxModule, MatDialogModule,
    MatMenuModule,
    MatSnackBarModule,
    MatInputModule,
    MatFormFieldModule,
    RouterModule.forRoot([
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'digitalmushaf'
      },
      {
        path: '',
        children: [         
          {
            path: 'digitalmushaf',
            component: HBMedinaComponent,
            data: {
              type: 'newmedina'
            },
          }
        ]
      },
      {
        path: '',
        component: QuranComponent,
        children: [          
          {
            path: 'about',
            component: AboutComponent
          }
        ]
      },    
      {
        path: 'otf',
        children: [
          {
            path: 'digitalmushaf',
            component: QuranOTFComponent
          },
          {
            path: 'oldmedina',
            component: OldMedinaComponent
          }
        ]
      },
      {
        path: 'hb',
        children: [          
          {
            path: 'oldmedina',
            component: HBMedinaComponent,
            providers: [{ provide: MUSHAFLAYOUTTYPE, useValue: MushafLayoutType.OldMadinah }],
            data: {
              type: 'oldmedina'
            },
          },
          {
            path: 'newmedina',
            component: HBMedinaComponent,
            providers: [{ provide: MUSHAFLAYOUTTYPE, useValue: MushafLayoutType.NewMadinah }],
            data: {
              type: 'newmedina'
            },
          },
          {
            path: 'indopak15',
            component: HBMedinaComponent,
            providers: [{ provide: MUSHAFLAYOUTTYPE, useValue: MushafLayoutType.IndoPak15Lines }],
            data: {
              type: 'indopak15'
            },
          }
        ]
      },
      {
        path: 'comparetajweed',
        component: CompareTajweedComponent,
      },
      {
        path: 'comparemushaf',
        component: CompareMushafComponent,
      },
      {
        path: '**', 
        component: PageNotFoundComponent
      },
    ], routerOptions),
    BrowserAnimationsModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
  ],
  providers: [
    QuranService,
    LayoutService,   
    { provide: MatIconRegistry, useClass: CustomIconRegistry },
    svgIconProviders,
    SidebarContentsService,
    {
      provide: RouteReuseStrategy,
      useClass: CacheRouteReuseStrategy
    },
    MatSnackBarModule,
    { provide: MUSHAFLAYOUTTYPE, useValue: MushafLayoutType.NewMadinah }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
