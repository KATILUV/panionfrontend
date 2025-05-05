import React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export interface WindowSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  withSeparator?: boolean;
  withBottomSeparator?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  rightContent?: React.ReactNode;
}

const WindowSection = React.forwardRef<HTMLDivElement, WindowSectionProps>(
  (
    {
      className,
      title,
      description,
      icon,
      children,
      withSeparator = false,
      withBottomSeparator = false,
      collapsible = false,
      defaultCollapsed = false,
      rightContent,
      ...props
    },
    ref
  ) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
      <div ref={ref} className={cn("window-section", className)} {...props}>
        {withSeparator && (
          <Separator className="my-4 bg-white/10" />
        )}

        {(title || description) && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {icon && <div className="mr-2">{icon}</div>}
              <div>
                {title && (
                  <h3 
                    className={cn(
                      "text-base font-medium text-white/90",
                      collapsible && "cursor-pointer hover:text-primary transition-colors"
                    )}
                    onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
                  >
                    {title}
                    {collapsible && (
                      <span className="ml-2 text-xs text-white/60">
                        {isCollapsed ? "(Show)" : "(Hide)"}
                      </span>
                    )}
                  </h3>
                )}
                {description && (
                  <p className="text-sm text-white/60 mt-0.5">{description}</p>
                )}
              </div>
            </div>
            {rightContent && (
              <div>{rightContent}</div>
            )}
          </div>
        )}

        {(!collapsible || !isCollapsed) && (
          <div className={cn("window-section-content", collapsible && "animate-in slide-in-from-top-1 duration-200")}>
            {children}
          </div>
        )}

        {withBottomSeparator && (
          <Separator className="mt-4 bg-white/10" />
        )}
      </div>
    );
  }
);

WindowSection.displayName = "WindowSection";

export { WindowSection };