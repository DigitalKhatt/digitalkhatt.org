/**
 * Sidebar - Navigation sidebar with surah list
 */

import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDigitalKhatt, type MushafLayoutTypeString } from '../lib';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layoutType: MushafLayoutTypeString;
  currentPage: number;
  onPageChange: (page: number) => void;
}

// ============================================
// Layout type mapping
// ============================================

const LAYOUT_TYPE_MAP: Record<MushafLayoutTypeString, 1 | 2 | 3> = {
  newMadinah: 1,
  oldMadinah: 2,
  indoPak15: 3,
};

// ============================================
// Component
// ============================================

export function Sidebar({
  open,
  onOpenChange,
  layoutType,
  currentPage,
  onPageChange,
}: SidebarProps) {
  const { getTextService, isReady } = useDigitalKhatt();

  const textService = useMemo(() => {
    if (!isReady) return null;
    return getTextService(LAYOUT_TYPE_MAP[layoutType]);
  }, [getTextService, layoutType, isReady]);

  const outline = textService?.outline ?? [];

  const handleSurahClick = (page: number) => {
    onPageChange(page);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      onOpenChange(false);
    }
  };

  // Find current surah based on page
  const currentSurahIndex = useMemo(() => {
    for (let i = outline.length - 1; i >= 0; i--) {
      if (outline[i].page <= currentPage) {
        return i;
      }
    }
    return 0;
  }, [outline, currentPage]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold">Surahs</h2>
        <p className="text-sm text-gray-500">{outline.length} surahs</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="py-2">
          {outline.map((item, index) => (
            <button
              key={index}
              onClick={() => handleSurahClick(item.page)}
              className={cn(
                'flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-gray-100',
                index === currentSurahIndex && 'bg-blue-50 text-blue-700'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                    index === currentSurahIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-xs text-gray-400">p. {item.page}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );

  // Mobile: Use Sheet (slide-out drawer)
  // Desktop: Render inline
  return (
    <>
      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-80 p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar - always visible when open */}
      <aside
        className={cn(
          'hidden border-r border-gray-200 bg-white transition-all duration-300 lg:block',
          open ? 'w-72' : 'w-0 overflow-hidden'
        )}
      >
        {open && sidebarContent}
      </aside>
    </>
  );
}

export default Sidebar;
