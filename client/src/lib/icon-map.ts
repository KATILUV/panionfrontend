/**
 * Centralized icon definitions for consistency across the application
 * 
 * This ensures all components use the same icon for the same concept,
 * making it easy to update icons app-wide in one place.
 */

// UI Actions
export const UI_ICONS = {
  // Window actions
  CLOSE: 'X',
  MINIMIZE: 'Minimize2',
  MAXIMIZE: 'Maximize2',
  RESTORE: 'Square',
  DRAG: 'GripVertical',
  RESIZE: 'CornerDownRight',
  
  // Navigation
  BACK: 'ArrowLeft',
  FORWARD: 'ArrowRight',
  HOME: 'Home',
  RELOAD: 'RefreshCw',
  REFRESH_CW: 'RefreshCw',
  
  // Common actions
  ADD: 'Plus',
  ADD_CIRCLE: 'PlusCircle',
  REMOVE: 'Minus',
  DELETE: 'Trash2',
  EDIT: 'Pencil',
  SAVE: 'Save',
  DOWNLOAD: 'Download',
  UPLOAD: 'Upload',
  SEARCH: 'Search',
  FILTER: 'Filter',
  SORT: 'ArrowUpDown',
  SETTINGS: 'Settings',
  MORE: 'MoreHorizontal',
  MENU: 'Menu',

  // Layout icons
  LAYOUT_SPLIT: 'LayoutPanelLeft',
  LAYOUT_GRID: 'LayoutGrid',
  GRID: 'Grid',
  
  // State indicators
  SUCCESS: 'CheckCircle',
  CHECK_CIRCLE: 'CheckCircle',
  ERROR: 'XCircle',
  ALERT_CIRCLE: 'AlertCircle',
  WARNING: 'AlertTriangle',
  ALERT_TRIANGLE: 'AlertTriangle',
  INFO: 'Info',
  LOADING: 'Loader2',
  LOADER: 'Loader2',
  X: 'X',
  BRAIN: 'Brain',
};

// Features and functionality
export const FEATURE_ICONS = {
  // Agents and tools
  PANION: 'MessageCircle',
  MARKETPLACE: 'Store',
  SETTINGS: 'Settings',
  NOTES: 'FileText',
  CALENDAR: 'Calendar',
  MUSIC: 'Music',
  FILES: 'FolderOpen',
  TERMINAL: 'Terminal',
  
  // System features  
  THEMES: 'Palette',
  LAYOUTS: 'Layout',
  COMMANDS: 'Command',
  NOTIFICATIONS: 'Bell',
  SECURITY: 'Shield',
  
  // Common status icons
  ACTIVE: 'Activity',
  OFFLINE: 'Power',
  LOCKED: 'Lock',
  UNLOCKED: 'Unlock',
  FAVORITE: 'Star',
  UNFAVORITE: 'StarOff',
  PINNED: 'Pin',
  CLOCK: 'Clock',
};

// Combined export for easy access
export const ICONS = {
  ...UI_ICONS,
  ...FEATURE_ICONS
};

export type IconName = keyof typeof ICONS;

export default ICONS;