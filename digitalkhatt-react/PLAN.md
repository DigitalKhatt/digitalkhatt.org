# React App Feature Parity Plan

## Overview
Migrate all features from the Angular Quran viewer to the React app, using Tailwind CSS for styling. The React app will have a single main viewer (multi-page scroll) instead of the current 3 demo tabs. Priority is feature parity first, then extracting shared logic to quran-engine.

## User Preferences
- **Design**: Tailwind CSS (lightweight, utility-first)
- **Default View**: Multi-page scroll viewer (like Angular)
- **App Structure**: Single main viewer (remove demo tabs)
- **Priority**: Feature parity first, then refactor to quran-engine

---

## Implementation Status

### Completed Features
| Feature | Status | Notes |
|---------|--------|-------|
| Tailwind CSS Setup | Done | Using Tailwind v4 with Vite plugin |
| shadcn/ui Components | Done | Button, Dialog, Sheet, DropdownMenu, Tooltip |
| Heroicons | Done | Using @heroicons/react |
| Professional Toolbar | Done | Navigation, zoom, settings, fullscreen |
| Sidebar Navigation | Done | Surah list with page numbers, responsive |
| Zoom Modes | Done | page-fit, page-width, page-height, percentage |
| Page Input Field | Done | Type page number to jump |
| localStorage Persistence | Done | Page, zoom, tajweed, verse format, layout |
| Full Screen Mode | Done | Toggle via button |
| Keyboard Zoom | Done | Ctrl++, Ctrl+-, Ctrl+0 |
| Responsive Defaults | Done | Mobile: page-width, Desktop: page-fit |
| About Dialog | Done | Project info and links |
| Demo Files Cleanup | Done | Removed old demo tabs |

### Already Working (from before)
| Feature | Notes |
|---------|-------|
| 3 Mushaf Layouts | NewMadinah, OldMadinah, IndoPak15 |
| Tajweed Colors | 8 color rules with toggle |
| Word/Verse Clicking | Click detection + highlighting |
| Multiple Highlight Groups | Custom colors |
| Verse Number Format | Arabic (١٢٣) / English (123) |
| Surah Header Rendering | With decorative frame |
| Touch Gestures | Pinch-to-zoom |
| Basic Keyboard Nav | Arrows, Page Up/Down, Home/End |

### Not Yet Implemented
| Feature | Priority | Notes |
|---------|----------|-------|
| Page Indicator Overlay | Low | Shows during scroll (built-in to QuranViewer) |
| PWA Support | Low | Service worker, manifest |

---

## File Structure

### New Files Created
| File | Description |
|------|-------------|
| `src/components/Toolbar.tsx` | Main toolbar with navigation and settings |
| `src/components/Sidebar.tsx` | Surah navigation sidebar |
| `src/components/AboutDialog.tsx` | Info modal |
| `src/components/ui/button.tsx` | shadcn/ui button |
| `src/components/ui/dialog.tsx` | shadcn/ui dialog |
| `src/components/ui/dropdown-menu.tsx` | shadcn/ui dropdown |
| `src/components/ui/sheet.tsx` | shadcn/ui sheet (mobile drawer) |
| `src/components/ui/tooltip.tsx` | shadcn/ui tooltip |
| `src/hooks/useLocalStorage.ts` | localStorage persistence hook |
| `src/lib/utils.ts` | Utility functions (cn) |

### Files Modified
| File | Changes |
|------|---------|
| `package.json` | Added Tailwind, shadcn deps, Heroicons |
| `vite.config.ts` | Added Tailwind plugin and @ alias |
| `tsconfig.app.json` | Added @/* path alias |
| `src/index.css` | Tailwind directives |
| `src/App.tsx` | New layout with toolbar + sidebar + viewer |
| `src/App.css` | Minimized (only sr-only class) |
| `src/lib/components/QuranViewer.tsx` | Added controlled scale prop |

### Files Removed
| File | Reason |
|------|--------|
| `src/demo/SinglePageDemo.tsx` | Consolidated to single viewer |
| `src/demo/ViewerDemo.tsx` | Logic moves to main App |
| `src/demo/InteractiveDemo.tsx` | Features merged into main viewer |

---

## Dependencies Added

```json
{
  "dependencies": {
    "@heroicons/react": "^2.2.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.2.8",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.18",
    "tailwindcss": "^4.1.18"
  }
}
```

---

## Future: Logic to Extract to quran-engine

After feature parity, consider moving these to the shared engine:

1. **Zoom calculation logic** - Currently in App.tsx
2. **Storage keys/defaults** - Standardize across apps
3. **Surah outline data** - Already in QuranTextService
4. **Page visibility calculation** - Used by both apps
