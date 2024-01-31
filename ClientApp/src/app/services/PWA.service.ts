import { ApplicationRef, Injectable } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';


import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { concat, interval } from 'rxjs';
import { filter, first, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PWAService {
  constructor(private swUpdate: SwUpdate, private snackbar: MatSnackBar, private appRef: ApplicationRef) {

    // Allow the app to stabilize first, before starting
    // polling for updates with `interval()`.
    const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    if (swUpdate.isEnabled) {
      everySixHoursOnceAppIsStable$.subscribe(() => swUpdate.checkForUpdate());
    }

    const updatesAvailable = swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      map(evt => ({
        type: 'UPDATE_AVAILABLE',
        current: evt.currentVersion,
        available: evt.latestVersion,
      }))).subscribe(evt => {
        const snack = this.snackbar.open('A new update is available.', 'Reload', {
          duration: 5 * 1000,
        });
        snack
          .onAction()
          .subscribe(() => {
            swUpdate.activateUpdate().then(() => document.location.reload());
          });

      });

    this.swUpdate.unrecoverable.subscribe(event => {
      this.snackbar.open('An error occurred that we cannot recover from:\n' +
        event.reason +
        '\n\nPlease reload the page.', 'OK', {
        duration: 5 * 1000,
      });

    });
  }
}
