/**
 * QuranEngineService
 *
 * Angular service that wraps @digitalkhatt/quran-engine for Quran rendering.
 * Extends QuranEngineServiceBase to add Angular-specific functionality.
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  QuranEngineServiceBase,
  type StatusObserver,
} from '@digitalkhatt/quran-engine/angular';
import type {
  QuranEngineConfig,
  IRenderer,
  LoadingStatus,
  PageFormat,
  RenderResult,
  QuranOutlineItem,
  RenderOptions,
} from '@digitalkhatt/quran-engine';

/**
 * Status update interface for Angular observables
 */
export interface EngineStatus {
  status: LoadingStatus;
  error: Error | null;
  message: string;
}

/**
 * Angular service for Quran rendering using @digitalkhatt/quran-engine
 *
 * This service provides:
 * - Observable-based status updates (RxJS BehaviorSubject)
 * - Automatic cleanup on destroy
 * - Promise-based initialization for legacy compatibility
 */
@Injectable()
export class QuranEngineService extends QuranEngineServiceBase implements OnDestroy {
  private _statusSubject = new BehaviorSubject<EngineStatus>({
    status: 'idle',
    error: null,
    message: '',
  });

  /** RxJS Observable for status updates */
  readonly statusObservable$: Observable<EngineStatus> = this._statusSubject.asObservable();

  /** Promise that resolves when the engine is ready (legacy compatibility) */
  private _initPromise: Promise<IRenderer> | null = null;

  constructor() {
    super();

    // Subscribe to base class status updates
    this.status$.subscribe((status) => {
      this._statusSubject.next({
        status,
        error: this.error,
        message: this.getStatusMessage(status),
      });
    });
  }

  /**
   * Initialize the engine with configuration
   * Returns a promise that resolves to the renderer
   */
  override async initialize(config: QuranEngineConfig): Promise<void> {
    this._statusSubject.next({
      status: 'loading',
      error: null,
      message: 'Initializing engine...',
    });

    try {
      await super.initialize(config);
      this._statusSubject.next({
        status: 'ready',
        error: null,
        message: 'Engine ready',
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this._statusSubject.next({
        status: 'error',
        error,
        message: `Error: ${error.message}`,
      });
      throw error;
    }
  }

  /**
   * Get a promise that resolves when the engine is ready
   * This is for legacy compatibility with the old QuranService
   */
  get promise(): Promise<IRenderer> {
    if (!this._initPromise) {
      // Return a promise that never resolves if not initialized
      return new Promise(() => {});
    }
    return this._initPromise;
  }

  /**
   * Set the initialization promise (for use by component that calls initialize)
   */
  setInitPromise(promise: Promise<IRenderer>): void {
    this._initPromise = promise;
  }

  /**
   * Get human-readable status message
   */
  private getStatusMessage(status: LoadingStatus): string {
    switch (status) {
      case 'idle':
        return 'Waiting to initialize';
      case 'loading':
        return 'Loading...';
      case 'ready':
        return 'Ready';
      case 'error':
        return 'Error occurred';
      default:
        return '';
    }
  }

  /**
   * Cleanup on Angular destroy
   */
  ngOnDestroy(): void {
    this.destroy();
    this._statusSubject.complete();
  }
}
