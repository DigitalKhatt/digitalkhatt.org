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

import { BrowserModule, HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { NgModule, Injectable } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, RouteReuseStrategy } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconRegistry } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { AppComponent } from './app.component';

import { QuranService } from './services/quranservice/quranservice.service';

//import { ScrollingModule, ScrollDispatchModule } from '@angular/cdk/scrolling';
import { ScrollingModule } from './services/scrolling/scrolling-module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { CustomIconRegistry, SVG_ICONS } from 'src/app/shared/custom-icon-registry';
import { PortalModule } from '@angular/cdk/portal';
import { SidebarContentsService } from './services/navigation/sidebarcontents';
import { QuranComponent } from './components/quran/quran.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

import * as Hammer from 'hammerjs';
import { QuranZoomDirective } from './components/quran/quranzoom.directive';
import { DragDropModule } from './services/drag-drop/drag-drop-module';
import { QuranZoomTouchDirective } from './components/quran/quranzoom.touch.directive';
import { QuranGesturesDirective } from './components/quran/qurangestures.directive';
import { AboutComponent } from './components/about/about.component';
import { CacheRouteReuseStrategy } from './services/cache-route-reuse.strategy';
import { DynamicTextComponent } from './components/dynamictext/dynamictext.component';
import { JoinLettersComponent } from './components/joinletters/joinletters.component';
import { EmptyComponent } from './components/empty/empty.component';
//import { DragDropModule } from '@angular/cdk/drag-drop';



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

  public overrides = {
    pan: { direction: Hammer.DIRECTION_ALL },
    swipe: { direction: Hammer.DIRECTION_ALL },
  };

  /*
  buildHammer(element: HTMLElement) {
    const mc = new Hammer(element, {
      touchAction: 'pan-y | pan-x'
    });

    return mc;
  }*/
}

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
  ],
  entryComponents: [
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
    HttpClientModule,
    FormsModule, ReactiveFormsModule,
    ScrollingModule,
    MatToolbarModule, MatButtonModule, MatSliderModule, MatCardModule, MatIconModule, MatSidenavModule, PortalModule,
    MatSlideToggleModule, MatInputModule, MatAutocompleteModule, MatDividerModule, MatSelectModule, MatRadioModule, MatCheckboxModule, MatDialogModule,
    DragDropModule,
    MatMenuModule,

    RouterModule.forRoot([
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'digitalmushaf'
      },     
      {
        path: '',
        component: QuranComponent,
        children: [
          {
            path: 'digitalmushaf',
            component: EmptyComponent
          },
          {
            path: 'about',
            component: AboutComponent 
          },
        ]

      },
      {
        path: '**',
        redirectTo: 'digitalmushaf'
      }


    ]),
    BrowserAnimationsModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
  ],
  providers: [
    QuranService,
    { provide: MatIconRegistry, useClass: CustomIconRegistry },
    svgIconProviders,
    SidebarContentsService,/*
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: MyHammerConfig
    }*/
    {
      provide: RouteReuseStrategy,
      useClass: CacheRouteReuseStrategy
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
