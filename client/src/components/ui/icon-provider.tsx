import React from 'react';
import { LucideIcon, LucideProps } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps extends Omit<LucideProps, 'size'> {
  name: string;
  size?: IconSize | number;
  className?: string;
  label?: string;
  withTooltip?: boolean;
}

// Map of sizes to pixel values - these ensure consistent sizing across the app
const sizeMap: Record<IconSize, number> = {
  'xs': 14,
  'sm': 16,
  'md': 20,
  'lg': 24,
  'xl': 32
};

/**
 * Icon component that ensures consistent styling across the application
 * Uses Lucide icons under the hood with standardized styling
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  className,
  label,
  withTooltip = false,
  ...props
}) => {
  // Get the proper icon from Lucide or use HelpCircle as fallback
  const IconComponent = ((LucideIcons as any)[name] as LucideIcon) || LucideIcons.HelpCircle;
  
  // Determine the actual pixel size
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];
  
  // Base styling for all icons
  const baseStyle = "transition-all duration-150 ease-in-out";
  
  const icon = (
    <IconComponent
      size={pixelSize}
      className={cn(baseStyle, className)}
      aria-hidden={!label}
      aria-label={label}
      {...props}
    />
  );
  
  // If we need a tooltip, wrap the icon
  if (withTooltip && label) {
    return (
      <div className="relative group">
        {icon}
        <div className="absolute z-50 scale-0 group-hover:scale-100 transition-transform duration-100 origin-top-left -top-1 left-full ml-1 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
          {label}
        </div>
      </div>
    );
  }
  
  return icon;
};

/**
 * Enhanced icon button with consistent styling
 */
export const IconButton: React.FC<IconProps & {
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'default' | 'ghost' | 'subtle' | 'destructive';
  active?: boolean;
}> = ({
  name,
  size = 'md',
  className,
  onClick,
  variant = 'default',
  active = false,
  label,
  ...props
}) => {
  const variantClasses = {
    default: `bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 
              ${active ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`,
    ghost: `hover:bg-slate-100 dark:hover:bg-slate-800 
            ${active ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`,
    subtle: `bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 
             ${active ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`,
    destructive: 'bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400'
  };
  
  return (
    <button
      type="button"
      className={cn(
        "relative rounded-full p-1.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
        variantClasses[variant],
        className
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name={name} size={size} {...props} />
    </button>
  );
};

export default Icon;