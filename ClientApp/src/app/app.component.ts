import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { SidebarContentsService } from './services/navigation/sidebarcontents';
import { CdkPortalOutlet } from '@angular/cdk/portal';
import { QuranService } from './services/quranservice/quranservice.service';

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


  constructor(private sidebarContentsService: SidebarContentsService, private quranService: QuranService) {    
  }

  ngOnInit() {
    this.sidebarContentsService.setOutlet(this.outlet);
    this.sidebarContentsService.setContainer(this._toolbarButtonsContainer);
  }

  updateHostClasses() {

  }


}
