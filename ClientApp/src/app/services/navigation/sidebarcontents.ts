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

import { Injectable, TemplateRef, ViewContainerRef, EmbeddedViewRef } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Observable, Subject } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { PortalOutlet, CdkPortal, CdkPortalOutlet, TemplatePortal } from '@angular/cdk/portal';



@Injectable()
export class SidebarContentsService {

    private titleSource = new Subject<string>();
    title$ = this.titleSource.asObservable();

    private toolbarButtonsSource = new Subject<TemplateRef<any>>();
    toolbarButtons$ = this.toolbarButtonsSource.asObservable();

    private outlet: CdkPortalOutlet;
    private container: ViewContainerRef;
    private _viewRef: EmbeddedViewRef<any>;

    constructor() {
       
    }

    setOutlet(outlet: CdkPortalOutlet) {
        this.outlet = outlet;
    }

    setContainer(container: ViewContainerRef) {
        this.container = container;
    }

    setPortal(portal: TemplatePortal) {
        this.outlet.detach()
        setTimeout(() => {
            this.outlet.attach(portal);
        });
       
        
    }

    setTemplateRef(template: TemplateRef<any>) {
        if (this._viewRef) {
            this.container.remove(this.container.indexOf(this._viewRef));
        }
        if (template) {
            this._viewRef = this.container.createEmbeddedView(template);
        }       

    }

    
}
