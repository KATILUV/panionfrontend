import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconName, ICONS } from '@/lib/icon-map';
import { Button, ButtonProps } from '@/components/ui/button';

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

  // Get the icon component from Lucide - this is type-safe
  // First check if the icon name exists in Lucide
  if (typeof name === 'string' && name in LucideIcons) {
    // If it does, use dynamic typing to render it
    const IconComponent = LucideIcons[name as keyof typeof LucideIcons] as React.ComponentType<React.SVGProps<SVGSVGElement>>;
    return (
      <IconComponent 
        className={cn(sizeMap[size], color && `text-${color}`, className)} 
        aria-hidden="true" 
      />
    );
  }
  
  // Fallback to HelpCircle if icon not found
  return (
    <LucideIcons.HelpCircle 
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

/**
 * Button with an icon for consistent UI patterns
 */
interface IconButtonProps extends ButtonProps {
  icon: IconName | string;
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  iconClassName?: string;
  children?: React.ReactNode;
}

export function IconButton({ 
  icon, 
  iconSize = 'sm', 
  iconClassName, 
  children, 
  className, 
  ...props 
}: IconButtonProps) {
  return (
    <Button 
      className={cn("flex items-center gap-2", className)} 
      {...props}
    >
      <Icon name={icon} size={iconSize} className={iconClassName} />
      {children}
    </Button>
  );
}