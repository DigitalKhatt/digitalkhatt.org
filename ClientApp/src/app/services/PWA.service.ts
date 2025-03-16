import { ApplicationRef, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';


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
      everySixHoursOnceAppIsStable$.subscribe(async () => {
        try {
          const updateFound = await swUpdate.checkForUpdate();
          console.log(updateFound ? 'A new version is available.' : 'Already on the latest version.');
        } catch (err) {
          console.error('Failed to check for updates:', err);
        }
      });
    }

    swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      map(evt => ({
        type: 'UPDATE_AVAILABLE',
        current: evt.currentVersion,
        available: evt.latestVersion,
      }))).subscribe(evt => {
        
        const snack = this.snackbar.open('A new update is available.', 'Reload');
        snack
          .onAction()
          .subscribe(() => {
            swUpdate.activateUpdate().then(() => document.location.reload());
          });
          /*
        document.location.reload();
        console.log("Application updated to the latest version.");
        this.snackbar.open('Application updated to the latest version.', 'OK', {
          duration: 5 * 1000,
        });*/
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
