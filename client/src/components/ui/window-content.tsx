import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const windowContentVariants = cva(
  "rounded-md text-white/90",
  {
    variants: {
      variant: {
        default: "bg-black/10", // Default dark theme style
        primary: "bg-primary/5 text-primary-foreground/90",
        secondary: "bg-secondary/5 text-secondary-foreground/90",
        ghost: "bg-transparent",
        card: "bg-card/80 backdrop-blur-sm",
        outline: "border border-white/10 bg-transparent",
      },
      padding: {
        default: "p-4",
        sm: "p-2",
        lg: "p-6",
        none: "p-0",
      },
      textColor: {
        default: "text-white/90",
        muted: "text-white/70",
        bright: "text-white",
        primary: "text-primary-foreground",
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      textColor: "default",
    },
  }
);

export interface WindowContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof windowContentVariants> {
  withScroll?: boolean;
  fullHeight?: boolean;
}

const WindowContent = React.forwardRef<HTMLDivElement, WindowContentProps>(
  (
    {
      className,
      variant,
      padding,
      textColor,
      children,
      withScroll = false,
      fullHeight = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          windowContentVariants({ variant, padding, textColor }),
          withScroll && "overflow-auto",
          withScroll && "scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent",
          fullHeight && "h-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

WindowContent.displayName = "WindowContent";

export { WindowContent, windowContentVariants };