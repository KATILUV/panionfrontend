import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconName, ICONS } from '@/lib/icon-map';

interface IconProps {
  name: IconName | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

/**
 * Icon component that provides a consistent way to display icons throughout the application
 * Uses Lucide icons internally but abstracts them away to provide a standardized interface
 */
export function Icon({ name, size = 'md', className, color }: IconProps) {
  // Map size to dimensions
  const sizeMap = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  // Get the icon component from Lucide
  const iconName = name as keyof typeof LucideIcons;
  const LucideIcon = LucideIcons[iconName] || LucideIcons.HelpCircle;

  return (
    <LucideIcon 
      className={cn(sizeMap[size], color && `text-${color}`, className)} 
      aria-hidden="true" 
    />
  );
}

/**
 * Function to render an SVG icon from a string
 * Useful for custom SVG icons or icons from external sources
 */
export function renderSvgIcon(svgString: string, className?: string, size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl') {
  // Default size is medium if not specified
  const sizeClass = size ? {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  }[size] : 'h-5 w-5';

  return (
    <span 
      className={cn('inline-block', sizeClass, className)} 
      dangerouslySetInnerHTML={{ __html: svgString }} 
    />
  );
}