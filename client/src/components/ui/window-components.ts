// Export all window-related components for easy import
export { WindowContent } from "./window-content";
export { WindowPanel } from "./window-panel";
export { WindowSection } from "./window-section";

// Export consistent text styles for use across window components
export const windowTextStyles = {
  // Headings
  title: "text-lg font-medium text-primary",
  subtitle: "text-sm text-white/70 mt-1",
  sectionTitle: "text-base font-medium text-white/90",
  sectionDescription: "text-sm text-white/60 mt-0.5",
  
  // Content text
  default: "text-white/90",
  muted: "text-white/70",
  bright: "text-white",
  primary: "text-primary-foreground",
  accent: "text-accent-foreground",
  secondary: "text-secondary-foreground",
  
  // Special text
  label: "text-sm font-medium text-white/80",
  caption: "text-xs text-white/60",
  error: "text-red-500",
  success: "text-green-500",
  warning: "text-amber-500",
  info: "text-blue-500",
  link: "text-primary hover:underline cursor-pointer",
};

// Export consistent spacing styles
export const windowSpacingStyles = {
  section: "mb-6",
  panel: "p-4",
  content: "p-4",
};