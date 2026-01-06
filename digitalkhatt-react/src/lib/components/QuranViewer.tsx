/**
 * QuranViewer - Multi-page virtualized Quran viewer component
 *
 * Displays multiple pages with virtualization for performance.
 * Uses SVG rendering via QuranPage components.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { MushafLayoutTypeString, WordClickInfo, VerseClickInfo, HighlightGroup } from '../core/types';
import type { VerseNumberFormat } from '@digitalkhatt/quran-engine';
import { QuranPage } from './QuranPage';
import { useDigitalKhatt } from './QuranProvider';

// ============================================
// Types
// ============================================

export interface QuranViewerProps {
  /** Mushaf layout type */
  layoutType: MushafLayoutTypeString;
  /** Initial page number (1-indexed) */
  initialPage?: number;

  // Viewport
  /** Container width */
  width?: number | string;
  /** Container height */
  height?: number | string;
  /** Page width in pixels */
  pageWidth?: number;

  // Zoom/Pan
  /** Minimum scale factor */
  minScale?: number;
  /** Maximum scale factor */
  maxScale?: number;
  /** Initial scale (used if scale prop is not provided) */
  initialScale?: number;
  /** Controlled scale (overrides internal state when provided) */
  scale?: number;
  /** Called when scale changes (for controlled mode) */
  onScaleChange?: (scale: number) => void;
  /** Enable pinch zoom on touch devices */
  enablePinchZoom?: boolean;

  // Navigation
  /** Called when page changes */
  onPageChange?: (pageNumber: number) => void;

  // Styling
  /** Enable Tajweed coloring */
  tajweedEnabled?: boolean;
  /** Page background color */
  backgroundColor?: string;
  /** Verse number format (default: 'arabic') */
  verseNumberFormat?: VerseNumberFormat;
  /** Gap between pages */
  pageGap?: number;

  // Highlighting
  /** Verses to highlight (single color, uses highlightColor) */
  highlightedVerses?: Array<{ surah: number; ayah: number }>;
  /** Words to highlight (single color, uses highlightColor) */
  highlightedWords?: Array<{ page: number; line: number; word: number }>;
  /** Highlight color (used for highlightedVerses and highlightedWords) */
  highlightColor?: string;
  /** Multiple highlight groups with different colors */
  highlightGroups?: HighlightGroup[];

  // Events
  /** Called when a word is clicked */
  onWordClick?: (info: WordClickInfo) => void;
  /** Called when a verse is clicked */
  onVerseClick?: (info: VerseClickInfo) => void;
  /** Called when mouse hovers over a word */
  onWordHover?: (info: WordClickInfo | null) => void;

  // Virtualization
  /** Number of pages to pre-render above and below viewport */
  overscanPages?: number;

  /** Custom class name */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

// ============================================
// Component
// ============================================

export function QuranViewer({
  layoutType,
  initialPage = 1,
  width = '100%',
  height = '100%',
  pageWidth = 400,
  minScale = 0.5,
  maxScale = 3,
  initialScale = 1,
  scale: controlledScale,
  onScaleChange,
  enablePinchZoom = true,
  onPageChange,
  tajweedEnabled = true,
  backgroundColor,
  verseNumberFormat = 'arabic',
  pageGap = 20,
  highlightedVerses = [],
  highlightedWords = [],
  highlightColor = 'rgba(255, 255, 0, 0.3)',
  highlightGroups = [],
  onWordClick,
  onVerseClick,
  onWordHover,
  overscanPages = 2,
  className,
  style,
}: QuranViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalScale, setInternalScale] = useState(initialScale);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // Use controlled scale if provided, otherwise use internal state
  const scale = controlledScale ?? internalScale;
  const setScale = (newScale: number) => {
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
  };

  const { isReady, getTextService } = useDigitalKhatt();
  const textService = useMemo(
    () => getTextService(layoutType === 'newMadinah' ? 1 : layoutType === 'oldMadinah' ? 2 : 3),
    [getTextService, layoutType]
  );

  const totalPages = textService?.nbPages ?? 604;

  // Calculate page height based on aspect ratio
  const pageHeight = useMemo(() => {
    return (pageWidth * 410) / 255;
  }, [pageWidth]);

  // Calculate total content height
  const totalHeight = useMemo(() => {
    return totalPages * (pageHeight * scale + pageGap) - pageGap;
  }, [totalPages, pageHeight, scale, pageGap]);

  // Calculate visible pages based on scroll position
  const calculateVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const scaledPageHeight = pageHeight * scale + pageGap;

    const startPage = Math.max(0, Math.floor(scrollTop / scaledPageHeight) - overscanPages);
    const endPage = Math.min(
      totalPages - 1,
      Math.ceil((scrollTop + viewportHeight) / scaledPageHeight) + overscanPages
    );

    setVisibleRange({ start: startPage, end: endPage });

    // Calculate current page (the one most visible in the center)
    const centerY = scrollTop + viewportHeight / 2;
    const centerPage = Math.floor(centerY / scaledPageHeight);
    const newCurrentPage = Math.max(1, Math.min(totalPages, centerPage + 1));

    if (newCurrentPage !== currentPage) {
      setCurrentPage(newCurrentPage);
      onPageChange?.(newCurrentPage);
    }
  }, [pageHeight, scale, pageGap, overscanPages, totalPages, currentPage, onPageChange]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      requestAnimationFrame(calculateVisibleRange);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    calculateVisibleRange(); // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [calculateVisibleRange]);

  // Recalculate on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleRange();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [calculateVisibleRange]);

  // Navigate to a specific page
  const goToPage = useCallback(
    (pageNumber: number) => {
      const container = containerRef.current;
      if (!container) return;

      const targetPage = Math.max(1, Math.min(totalPages, pageNumber));
      const scaledPageHeight = pageHeight * scale + pageGap;
      const scrollTop = (targetPage - 1) * scaledPageHeight;

      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    },
    [totalPages, pageHeight, scale, pageGap]
  );

  // Handle zoom
  const handleZoom = useCallback(
    (newScale: number) => {
      const container = containerRef.current;
      if (!container) return;

      const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
      const scrollRatio = container.scrollTop / (totalHeight || 1);

      setScale(clampedScale);

      // Maintain scroll position ratio after zoom
      requestAnimationFrame(() => {
        const newTotalHeight = totalPages * (pageHeight * clampedScale + pageGap) - pageGap;
        container.scrollTop = scrollRatio * newTotalHeight;
      });
    },
    [minScale, maxScale, totalHeight, totalPages, pageHeight, pageGap]
  );

  // Pinch zoom handling
  useEffect(() => {
    if (!enablePinchZoom) return;

    const container = containerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialScale = scale;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.sqrt(dx * dx + dy * dy);
        initialScale = scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const newScale = initialScale * (distance / initialDistance);
        handleZoom(newScale);
      }
    };

    const handleTouchEnd = () => {
      initialDistance = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enablePinchZoom, scale, handleZoom]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PageDown' || e.key === 'ArrowRight') {
        goToPage(currentPage + 1);
        e.preventDefault();
      } else if (e.key === 'PageUp' || e.key === 'ArrowLeft') {
        goToPage(currentPage - 1);
        e.preventDefault();
      } else if (e.key === 'Home') {
        goToPage(1);
        e.preventDefault();
      } else if (e.key === 'End') {
        goToPage(totalPages);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, goToPage]);

  // Filter highlighted words for a specific page
  const getHighlightedWordsForPage = useCallback(
    (pageNumber: number) => {
      return highlightedWords
        .filter((w) => w.page === pageNumber)
        .map((w) => ({ line: w.line, word: w.word }));
    },
    [highlightedWords]
  );

  // Generate visible pages
  const visiblePages = useMemo(() => {
    const pages: React.ReactNode[] = [];

    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const pageNumber = i + 1;
      const scaledPageHeight = pageHeight * scale;

      pages.push(
        <div
          key={pageNumber}
          style={{
            position: 'absolute',
            top: i * (scaledPageHeight + pageGap),
            left: '50%',
            transform: 'translateX(-50%)',
            width: pageWidth * scale,
            height: scaledPageHeight,
          }}
        >
          <QuranPage
            pageNumber={pageNumber}
            layoutType={layoutType}
            width={pageWidth}
            scale={scale}
            tajweedEnabled={tajweedEnabled}
            backgroundColor={backgroundColor}
            verseNumberFormat={verseNumberFormat}
            highlightedVerses={highlightedVerses}
            highlightedWords={getHighlightedWordsForPage(pageNumber)}
            highlightColor={highlightColor}
            highlightGroups={highlightGroups}
            onWordClick={onWordClick}
            onVerseClick={onVerseClick}
            onWordHover={onWordHover}
          />
        </div>
      );
    }

    return pages;
  }, [
    visibleRange,
    pageHeight,
    scale,
    pageGap,
    pageWidth,
    layoutType,
    tajweedEnabled,
    backgroundColor,
    verseNumberFormat,
    highlightedVerses,
    highlightColor,
    highlightGroups,
    onWordClick,
    onVerseClick,
    onWordHover,
    getHighlightedWordsForPage,
  ]);

  if (!isReady) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: backgroundColor || '#f5f5f5',
          ...style,
        }}
      >
        <span>Loading Quran viewer...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width,
        height,
        overflow: 'auto',
        position: 'relative',
        backgroundColor: backgroundColor || '#f5f5f5',
        ...style,
      }}
      tabIndex={0}
      role="document"
      aria-label={`Quran viewer - Page ${currentPage} of ${totalPages}`}
    >
      {/* Content container with total height for scrollbar */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: totalHeight,
          minHeight: '100%',
        }}
      >
        {visiblePages}
      </div>

      {/* Page indicator */}
      <div
        style={{
          position: 'sticky',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: 4,
          fontSize: 14,
          zIndex: 10,
          pointerEvents: 'none',
          width: 'fit-content',
        }}
      >
        Page {currentPage} / {totalPages}
      </div>
    </div>
  );
}

// ============================================
// Navigation Hook
// ============================================

export interface QuranViewerRef {
  goToPage: (pageNumber: number) => void;
  getCurrentPage: () => number;
  setScale: (scale: number) => void;
  getScale: () => number;
}

export default QuranViewer;
