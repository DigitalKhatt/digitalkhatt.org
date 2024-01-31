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
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with DigitalKhatt. If not, see
 * <https: //www.gnu.org/licenses />.
*/

import { CdkPortalOutlet } from '@angular/cdk/portal';
import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { PWAService } from './services/PWA.service';
import { SidebarContentsService } from './services/navigation/sidebarcontents';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';

  isStarting = false;
  isSideBySide = true;

  get mode() { return this.isSideBySide ? 'side' : 'over'; }

  @ViewChild(CdkPortalOutlet, { static: true }) outlet;

  @ViewChild('toolbarButtonsContainer', { read: ViewContainerRef, static: true }) _toolbarButtonsContainer: ViewContainerRef;


  constructor(private sidebarContentsService: SidebarContentsService, private pwaService: PWAService) {    
  }

  ngOnInit() {
    this.sidebarContentsService.setOutlet(this.outlet);
    this.sidebarContentsService.setContainer(this._toolbarButtonsContainer);
  }

  updateHostClasses() {

  }


}
