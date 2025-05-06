import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';

// Define widget types that can be shown in the taskbar
export type TaskbarWidgetType = 
  | 'quickSave'      // Quick Save button
  | 'systemConsole'  // System console button
  | 'layoutManager'  // Layout manager button
  | 'versionNumber'  // Version number display
  | 'clock'          // Clock widget
  | 'searchBar'      // Search bar
  | 'notifications'  // Notifications center
  | 'aiStatus';      // AI status indicator

export interface TaskbarPosition {
  location: 'top' | 'bottom' | 'left' | 'right';
  alignment: 'start' | 'end' | 'center' | 'space-between';
}

interface TaskbarState {
  // Position and appearance
  position: TaskbarPosition;
  enableBlur: boolean;
  showLabels: boolean;
  autohide: boolean;
  
  // Widget visibility
  visibleWidgets: TaskbarWidgetType[];
  
  // Actions
  toggleWidget: (widget: TaskbarWidgetType) => void;
  setPosition: (position: TaskbarPosition) => void;
  setEnableBlur: (enable: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setAutohide: (autohide: boolean) => void;
  
  // Presets
  applyMinimalPreset: () => void;
  applyFullPreset: () => void;
  applyClassicPreset: () => void;
  
  // Helpers
  isWidgetVisible: (widget: TaskbarWidgetType) => boolean;
}

// Default widgets shown in the taskbar
const DEFAULT_WIDGETS: TaskbarWidgetType[] = [
  'quickSave',
  'systemConsole',
  'layoutManager',
  'versionNumber'
];

// Minimal set of widgets
const MINIMAL_WIDGETS: TaskbarWidgetType[] = [
  'layoutManager',
  'systemConsole'
];

// Full set of widgets
const FULL_WIDGETS: TaskbarWidgetType[] = [
  'quickSave',
  'systemConsole',
  'layoutManager',
  'versionNumber',
  'clock',
  'searchBar',
  'notifications',
  'aiStatus'
];

// Classic Windows-like taskbar
const CLASSIC_WIDGETS: TaskbarWidgetType[] = [
  'searchBar',
  'quickSave',
  'layoutManager',
  'systemConsole',
  'clock'
];

export const useTaskbarStore = create<TaskbarState>()(
  persist(
    (set, get) => ({
      // Default values
      position: { location: 'bottom', alignment: 'space-between' },
      enableBlur: true,
      showLabels: true,
      autohide: false,
      visibleWidgets: [...DEFAULT_WIDGETS],
      
      // Toggle visibility of a widget
      toggleWidget: (widget) => {
        const current = get().visibleWidgets;
        const isVisible = current.includes(widget);
        
        if (isVisible) {
          log.info(`Removed ${widget} widget from taskbar`);
          set({ visibleWidgets: current.filter(w => w !== widget) });
        } else {
          log.info(`Added ${widget} widget to taskbar`);
          set({ visibleWidgets: [...current, widget] });
        }
      },
      
      // Set taskbar position
      setPosition: (position) => {
        log.info(`Taskbar position changed to: ${position.location}, alignment: ${position.alignment}`);
        set({ position });
      },
      
      // Set whether to enable blur effect
      setEnableBlur: (enable) => {
        log.info(`Taskbar blur effect ${enable ? 'enabled' : 'disabled'}`);
        set({ enableBlur: enable });
      },
      
      // Set whether to show text labels
      setShowLabels: (show) => {
        log.info(`Taskbar labels ${show ? 'shown' : 'hidden'}`);
        set({ showLabels: show });
      },
      
      // Set whether taskbar should auto-hide
      setAutohide: (autohide) => {
        log.info(`Taskbar auto-hide ${autohide ? 'enabled' : 'disabled'}`);
        set({ autohide });
      },
      
      // Apply minimal preset
      applyMinimalPreset: () => {
        log.info("Applied minimal taskbar preset");
        set({ 
          visibleWidgets: [...MINIMAL_WIDGETS],
          showLabels: false,
          position: { location: 'bottom', alignment: 'center' }
        });
      },
      
      // Apply full preset
      applyFullPreset: () => {
        log.info("Applied full taskbar preset");
        set({ 
          visibleWidgets: [...FULL_WIDGETS],
          showLabels: true,
          position: { location: 'bottom', alignment: 'space-between' }
        });
      },
      
      // Apply classic preset
      applyClassicPreset: () => {
        log.info("Applied classic taskbar preset");
        set({ 
          visibleWidgets: [...CLASSIC_WIDGETS],
          showLabels: true,
          position: { location: 'bottom', alignment: 'space-between' },
          autohide: false
        });
      },
      
      // Check if a widget is visible
      isWidgetVisible: (widget) => {
        return get().visibleWidgets.includes(widget);
      }
    }),
    {
      name: 'panion-taskbar-store'
    }
  )
);