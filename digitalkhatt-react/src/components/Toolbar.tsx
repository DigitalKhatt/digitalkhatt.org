/**
 * Toolbar - Main navigation and controls toolbar for the Quran viewer
 */

import { useState, useRef, useEffect } from 'react';
import {
  Bars3Icon,
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { MushafLayoutTypeString, VerseNumberFormat } from '../lib';

// ============================================
// Types
// ============================================

export type ZoomMode = 'page-fit' | 'page-width' | 'page-height' | number;

export interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  layoutType: MushafLayoutTypeString;
  onLayoutChange: (layout: MushafLayoutTypeString) => void;
  tajweedEnabled: boolean;
  onTajweedChange: (enabled: boolean) => void;
  verseNumberFormat: VerseNumberFormat;
  onVerseFormatChange: (format: VerseNumberFormat) => void;
  zoom: ZoomMode;
  onZoomChange: (zoom: ZoomMode) => void;
  onMenuClick: () => void;
  onFullScreen: () => void;
  onAboutClick: () => void;
}

// ============================================
// Constants
// ============================================

const LAYOUT_OPTIONS: { value: MushafLayoutTypeString; label: string }[] = [
  { value: 'newMadinah', label: 'New Madinah' },
  { value: 'oldMadinah', label: 'Old Madinah' },
  { value: 'indoPak15', label: 'IndoPak 15-Line' },
];

const ZOOM_PRESETS: { value: ZoomMode; label: string }[] = [
  { value: 'page-fit', label: 'Page Fit' },
  { value: 'page-width', label: 'Page Width' },
  { value: 'page-height', label: 'Page Height' },
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' },
];

// ============================================
// Component
// ============================================

export function Toolbar({
  currentPage,
  totalPages,
  onPageChange,
  layoutType,
  onLayoutChange,
  tajweedEnabled,
  onTajweedChange,
  verseNumberFormat,
  onVerseFormatChange,
  zoom,
  onZoomChange,
  onMenuClick,
  onFullScreen,
  onAboutClick,
}: ToolbarProps) {
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const pageInputRef = useRef<HTMLInputElement>(null);

  // Update page input when currentPage changes externally
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
      pageInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setPageInput(currentPage.toString());
      pageInputRef.current?.blur();
    }
  };

  const getZoomLabel = (z: ZoomMode): string => {
    if (typeof z === 'number') {
      return `${Math.round(z * 100)}%`;
    }
    const preset = ZOOM_PRESETS.find((p) => p.value === z);
    return preset?.label ?? String(z);
  };

  const handleZoomIn = () => {
    if (typeof zoom === 'number') {
      const newZoom = Math.min(4, zoom * 1.1);
      onZoomChange(newZoom);
    } else {
      onZoomChange(1.1);
    }
  };

  const handleZoomOut = () => {
    if (typeof zoom === 'number') {
      const newZoom = Math.max(0.25, zoom / 1.1);
      onZoomChange(newZoom);
    } else {
      onZoomChange(0.9);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-2 shadow-sm">
        {/* Left section - Menu button */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onMenuClick}>
                <Bars3Icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle sidebar</TooltipContent>
          </Tooltip>

          {/* Layout dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                {LAYOUT_OPTIONS.find((o) => o.value === layoutType)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup
                value={layoutType}
                onValueChange={(v) => onLayoutChange(v as MushafLayoutTypeString)}
              >
                {LAYOUT_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center section - Navigation */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="hidden sm:flex"
              >
                <ChevronDoubleLeftIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>First page</TooltipContent>
          </Tooltip>

          {/* Previous page */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous page</TooltipContent>
          </Tooltip>

          {/* Page input */}
          <div className="flex items-center gap-1 text-sm">
            <input
              ref={pageInputRef}
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputSubmit}
              onKeyDown={handlePageInputKeyDown}
              className="w-12 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none"
            />
            <span className="text-gray-500">/ {totalPages}</span>
          </div>

          {/* Next page */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next page</TooltipContent>
          </Tooltip>

          {/* Last page */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="hidden sm:flex"
              >
                <ChevronDoubleRightIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Last page</TooltipContent>
          </Tooltip>

          {/* Zoom out */}
          <div className="ml-2 hidden items-center gap-1 border-l border-gray-200 pl-2 md:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <MagnifyingGlassMinusIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>

            {/* Zoom dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-24">
                  {getZoomLabel(zoom)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {ZOOM_PRESETS.map((preset, idx) => (
                  <DropdownMenuItem
                    key={preset.label}
                    onClick={() => onZoomChange(preset.value)}
                    className={zoom === preset.value ? 'bg-gray-100' : ''}
                  >
                    {preset.label}
                    {idx === 2 && <DropdownMenuSeparator className="my-1" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Zoom in */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <MagnifyingGlassPlusIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right section - Settings and info */}
        <div className="flex items-center gap-1">
          {/* Tajweed toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden lg:flex">
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={tajweedEnabled}
                onCheckedChange={onTajweedChange}
              >
                Tajweed Colors
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={verseNumberFormat}
                onValueChange={(v) => onVerseFormatChange(v as VerseNumberFormat)}
              >
                <DropdownMenuRadioItem value="arabic">
                  Verse Numbers: Arabic (١٢٣)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="english">
                  Verse Numbers: English (123)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Verse format toggle - compact for mobile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onVerseFormatChange(verseNumberFormat === 'arabic' ? 'english' : 'arabic')
                }
                className="lg:hidden"
              >
                {verseNumberFormat === 'arabic' ? '١٢٣' : '123'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle verse number format</TooltipContent>
          </Tooltip>

          {/* Fullscreen button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onFullScreen}>
                <ArrowsPointingOutIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Full screen</TooltipContent>
          </Tooltip>

          {/* About button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onAboutClick}>
                <InformationCircleIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>About</TooltipContent>
          </Tooltip>

          {/* External links */}
          <div className="ml-1 hidden items-center gap-1 border-l border-gray-200 pl-1 sm:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="https://github.com/niccokunzmann/digitalkhatt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </TooltipTrigger>
              <TooltipContent>View on GitHub</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Toolbar;
