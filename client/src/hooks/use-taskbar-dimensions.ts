import { useTaskbarStore } from '@/state/taskbarStore';
import { useScreenSize } from '@/hooks/use-mobile';

// Height values from the taskbar component
const MOBILE_XS_TASKBAR_HEIGHT = 48; // 3rem
const MOBILE_SM_TASKBAR_HEIGHT = 56; // 3.5rem
const DESKTOP_TASKBAR_HEIGHT = 56; // 3.5rem
const DESKTOP_SIDE_TASKBAR_WIDTH = 56; // 3.5rem (without labels)
const DESKTOP_SIDE_TASKBAR_WIDTH_WITH_LABELS = 80; // 5rem (with labels)

interface TaskbarDimensions {
  height: number;
  width: number;
  position: 'top' | 'bottom' | 'left' | 'right';
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Hook to get the current taskbar dimensions and safe area insets
 * to prevent windows from covering the taskbar
 */
export function useTaskbarDimensions(): TaskbarDimensions {
  const { position, showLabels } = useTaskbarStore();
  const { size: screenSize, isMobile } = useScreenSize();
  
  // Determine taskbar height based on screen size and position
  let taskbarHeight = DESKTOP_TASKBAR_HEIGHT;
  let taskbarWidth = 0;
  
  // For mobile or small screens, use appropriate height
  if (isMobile || screenSize === 'xs' || screenSize === 'sm') {
    taskbarHeight = screenSize === 'xs' ? MOBILE_XS_TASKBAR_HEIGHT : MOBILE_SM_TASKBAR_HEIGHT;
    taskbarWidth = window.innerWidth; // Full width on mobile
  } else {
    // For desktop
    if (position.location === 'left' || position.location === 'right') {
      taskbarWidth = showLabels ? DESKTOP_SIDE_TASKBAR_WIDTH_WITH_LABELS : DESKTOP_SIDE_TASKBAR_WIDTH;
      taskbarHeight = window.innerHeight; // Full height for side taskbars
    } else {
      taskbarWidth = window.innerWidth; // Full width for top/bottom taskbars
    }
  }
  
  // Calculate safe area insets to prevent windows from covering the taskbar
  const safeAreaInsets = {
    top: position.location === 'top' ? taskbarHeight : 0,
    right: position.location === 'right' ? taskbarWidth : 0,
    bottom: position.location === 'bottom' ? taskbarHeight : 0,
    left: position.location === 'left' ? taskbarWidth : 0
  };
  
  return {
    height: taskbarHeight,
    width: taskbarWidth,
    position: position.location,
    safeAreaInsets
  };
}