import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/state/themeStore";
import { AgentStatus, AgentStatusType } from "@/components/ui/agent-status";
import { cva, type VariantProps } from "class-variance-authority";

// Define variants for the window panel using class-variance-authority
const windowPanelVariants = cva(
  "rounded-md border shadow-sm backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "bg-black/20 border-white/10", // Default dark theme style
        primary: "bg-primary/10 border-primary/20",
        secondary: "bg-secondary/10 border-secondary/20",
        card: "bg-card border-card-foreground/10",
        flat: "bg-transparent border-transparent shadow-none",
      },
      size: {
        default: "p-4",
        sm: "p-2",
        lg: "p-6",
        xl: "p-8",
        none: "p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface WindowPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof windowPanelVariants> {
  status?: AgentStatusType;
  statusLabel?: string;
  title?: string;
  subtitle?: string;
  titleClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  showHeader?: boolean;
  fullHeight?: boolean;
  withScroll?: boolean;
}

const WindowPanel = React.forwardRef<HTMLDivElement, WindowPanelProps>(
  (
    {
      className,
      variant,
      size,
      status,
      statusLabel,
      title,
      subtitle,
      children,
      titleClassName,
      headerClassName,
      bodyClassName,
      contentClassName,
      showHeader = true,
      fullHeight = false,
      withScroll = false,
      ...props
    },
    ref
  ) => {
    // All themes are dark in Panion OS

    return (
      <Card
        ref={ref}
        className={cn(
          windowPanelVariants({ variant, size }),
          fullHeight && "h-full",
          fullHeight && withScroll && "flex flex-col",
          className
        )}
        {...props}
      >
        {/* Conditionally render the header */}
        {showHeader && (title || status) && (
          <div
            className={cn(
              "flex items-center justify-between mb-4",
              headerClassName
            )}
          >
            <div>
              {title && (
                <h2
                  className={cn(
                    "font-medium text-lg text-primary",
                    titleClassName
                  )}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  className={cn(
                    "text-sm text-muted-foreground mt-1"
                  )}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {status && (
              <AgentStatus
                status={status}
                size="sm"
                label={statusLabel}
                className="mr-1"
              />
            )}
          </div>
        )}

        {/* Panel content */}
        <div
          className={cn(
            withScroll && "flex-1 overflow-auto",
            withScroll &&
              "scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent",
            bodyClassName
          )}
        >
          <div className={cn(contentClassName)}>{children}</div>
        </div>
      </Card>
    );
  }
);

WindowPanel.displayName = "WindowPanel";

export { WindowPanel, windowPanelVariants };