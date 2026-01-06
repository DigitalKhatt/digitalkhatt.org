/**
 * @digitalkhatt/quran-engine/react - QuranProvider
 *
 * React context provider for Quran engine.
 * Manages engine initialization and provides access to rendering functions.
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode, ReactElement } from 'react';
import type { QuranEngineConfig } from '../../config';
import type { IRenderer } from '../../renderers/types';
import type { LoadingStatus, PageFormat, RenderResult, QuranOutlineItem } from '../../core/types';
import type { RenderOptions } from '../../canvas/CanvasRenderer';
import { createQuranEngine } from '../../config';

/**
 * Context value provided by QuranProvider
 */
export interface QuranContextValue {
  /** Current loading status */
  status: LoadingStatus;

  /** Error if loading failed */
  error: Error | null;

  /** Whether the engine is ready */
  isReady: boolean;

  /** Render a page to canvas */
  renderPage: (
    canvas: HTMLCanvasElement,
    pageIndex: number,
    viewport: PageFormat,
    options?: RenderOptions
  ) => Promise<RenderResult>;

  /** Get total page count */
  getPageCount: () => number;

  /** Get navigation outline */
  getOutline: () => QuranOutlineItem[];
}

const QuranContext = createContext<QuranContextValue | null>(null);

/**
 * Props for QuranProvider
 */
export interface QuranProviderProps {
  /** Engine configuration */
  config: QuranEngineConfig;

  /** Children to render */
  children: ReactNode;

  /** Callback when engine is ready */
  onReady?: () => void;

  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * QuranProvider component
 *
 * Provides Quran engine functionality to child components via React context.
 */
export function QuranProvider({ config, children, onReady, onError }: QuranProviderProps): ReactElement {
  const [status, setStatus] = useState<LoadingStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [engine, setEngine] = useState<IRenderer | null>(null);

  // Initialize engine
  useEffect(() => {
    let mounted = true;

    async function init() {
      setStatus('loading');
      setError(null);

      try {
        const eng = await createQuranEngine(config);

        if (mounted) {
          setEngine(eng);
          setStatus('ready');
          onReady?.();
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setStatus('error');
          onError?.(error);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      engine?.destroy();
    };
  }, [config.layoutType, config.renderer, config.assets.harfbuzzWasm]);

  // Render page function
  const renderPage = useCallback(
    async (
      canvas: HTMLCanvasElement,
      pageIndex: number,
      viewport: PageFormat,
      options?: RenderOptions
    ): Promise<RenderResult> => {
      if (!engine) {
        throw new Error('Engine not initialized');
      }
      return engine.renderPage(canvas, pageIndex, viewport, options);
    },
    [engine]
  );

  // Get page count
  const getPageCount = useCallback((): number => {
    return engine?.getPageCount() ?? 0;
  }, [engine]);

  // Get outline
  const getOutline = useCallback((): QuranOutlineItem[] => {
    return engine?.getOutline() ?? [];
  }, [engine]);

  // Context value
  const contextValue = useMemo<QuranContextValue>(
    () => ({
      status,
      error,
      isReady: status === 'ready',
      renderPage,
      getPageCount,
      getOutline,
    }),
    [status, error, renderPage, getPageCount, getOutline]
  );

  return <QuranContext.Provider value={contextValue}>{children}</QuranContext.Provider>;
}

/**
 * Hook to access Quran engine context
 */
export function useQuranEngine(): QuranContextValue {
  const context = useContext(QuranContext);
  if (!context) {
    throw new Error('useQuranEngine must be used within a QuranProvider');
  }
  return context;
}

/**
 * Alias for useQuranEngine
 */
export const useDigitalKhatt = useQuranEngine;
