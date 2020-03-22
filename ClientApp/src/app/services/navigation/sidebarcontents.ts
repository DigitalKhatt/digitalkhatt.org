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
