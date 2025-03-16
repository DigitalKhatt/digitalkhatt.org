//import 'hammerjs';
import { enableProdMode, importProvidersFrom } from '@angular/core';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ExtraOptions, RouteReuseStrategy, RouterOutlet, provideRouter, withInMemoryScrolling } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppComponent } from './app/app.component';
import { svgIconProviders } from './app/app.module';
import { routes } from './app/app.routes';
import { CacheRouteReuseStrategy } from './app/services/cache-route-reuse.strategy';
import { LayoutService } from './app/services/layoutservice/layoutservice.service';
import { SidebarContentsService } from './app/services/navigation/sidebarcontents';
import { QuranService } from './app/services/quranservice/quranservice.service';
import { MUSHAFLAYOUTTYPE, MushafLayoutType } from './app/services/qurantext.service';
import { CustomIconRegistry } from './app/shared/custom-icon-registry';
import { environment } from './environments/environment';

const routerOptions: ExtraOptions = {
  anchorScrolling: 'enabled'
};



export function getBaseUrl() {
  return document.getElementsByTagName('base')[0].href;
}

const providers = [
  { provide: 'BASE_URL', useFactory: getBaseUrl, deps: [] }
];

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(FormsModule, ReactiveFormsModule, ScrollingModule, DragDropModule, MatToolbarModule, MatButtonModule, MatSliderModule,
      MatCardModule, MatIconModule, MatSidenavModule, PortalModule, MatSlideToggleModule, MatInputModule, MatAutocompleteModule, MatDividerModule,
      MatSelectModule, MatRadioModule, MatCheckboxModule, MatDialogModule, MatMenuModule, MatSnackBarModule, MatInputModule, MatFormFieldModule,      
      ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })),
    QuranService,
    LayoutService,
    { provide: MatIconRegistry, useClass: CustomIconRegistry },
    svgIconProviders,
    SidebarContentsService,
    {
      provide: RouteReuseStrategy,
      useClass: CacheRouteReuseStrategy
    },    
    { provide: MUSHAFLAYOUTTYPE, useValue: MushafLayoutType.NewMadinah },
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideRouter(routes, withInMemoryScrolling({
      anchorScrolling: 'enabled'
    }))
  ]
})
  .catch(err => console.error(err));

//export { renderModule, renderModuleFactory } from '@angular/platform-server';
