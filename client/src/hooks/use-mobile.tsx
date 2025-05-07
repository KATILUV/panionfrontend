import * as React from "react"

// Breakpoints for different device categories
const MOBILE_BREAKPOINT = 768;     // Smaller phones to small tablets
const TABLET_BREAKPOINT = 1024;    // Small tablets to large tablets
const DESKTOP_BREAKPOINT = 1280;   // Laptops and desktops

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Hook that provides information about screen size and device type
 * @returns object with screen size info
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<{
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    size: ScreenSize;
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    size: 'lg'
  });

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < MOBILE_BREAKPOINT;
      const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
      const isDesktop = width >= TABLET_BREAKPOINT;
      
      // Determine size category
      let size: ScreenSize = 'lg';
      if (width < 480) size = 'xs';
      else if (width < MOBILE_BREAKPOINT) size = 'sm';
      else if (width < TABLET_BREAKPOINT) size = 'md';
      else if (width < DESKTOP_BREAKPOINT) size = 'lg';
      else size = 'xl';
      
      setScreenSize({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        size
      });
    };

    // Initial update
    updateScreenSize();

    // Setup event listener for window resize
    window.addEventListener('resize', updateScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}

/**
 * Simple hook that returns whether the device is mobile
 * @returns boolean indicating if viewport is mobile size
 */
export function useIsMobile() {
  const { isMobile } = useScreenSize();
  return isMobile;
}

/**
 * Hook to get orientation of the device
 * @returns 'portrait' or 'landscape'
 */
export function useOrientation() {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>(
    typeof window !== 'undefined' 
      ? window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      : 'landscape'
  );
  
  React.useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };
    
    // Initial update
    updateOrientation();
    
    // Setup event listener
    window.addEventListener('resize', updateOrientation);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);
  
  return orientation;
}
