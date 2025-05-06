import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

const spinnerVariants = cva(
  "inline-block rounded-full border-current animate-spin",
  {
    variants: {
      size: {
        xs: "h-3 w-3 border-[2px]",
        sm: "h-4 w-4 border-[2px]",
        md: "h-6 w-6 border-[3px]",
        lg: "h-8 w-8 border-[3px]",
        xl: "h-12 w-12 border-[4px]",
      },
      variant: {
        default: "border-t-transparent",
        dots: "",
        pulse: "",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

/**
 * Spinner component for loading states
 */
export function Spinner({ 
  className, 
  size, 
  variant, 
  label,
  ...props 
}: SpinnerProps) {
  if (variant === "dots") {
    return (
      <div
        role="status"
        aria-label={label || "Loading"}
        className={cn("flex space-x-1.5 items-center justify-center", className)}
        {...props}
      >
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={cn(
              "rounded-full bg-current",
              size === "xs" ? "h-1.5 w-1.5" : "",
              size === "sm" ? "h-2 w-2" : "",
              size === "md" ? "h-2.5 w-2.5" : "",
              size === "lg" ? "h-3 w-3" : "",
              size === "xl" ? "h-4 w-4" : "",
              !size && "h-2.5 w-2.5"
            )}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
        {label && <span className="sr-only">{label}</span>}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div
        role="status"
        aria-label={label || "Loading"}
        className={cn("relative", className)}
        {...props}
      >
        <motion.div
          className={cn(
            "absolute rounded-full bg-current/10",
            size === "xs" ? "h-5 w-5" : "",
            size === "sm" ? "h-6 w-6" : "",
            size === "md" ? "h-10 w-10" : "",
            size === "lg" ? "h-16 w-16" : "",
            size === "xl" ? "h-20 w-20" : "",
            !size && "h-10 w-10"
          )}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 0.6, 0],
            scale: [0.85, 1.2, 0.85],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div 
          className={cn(
            "rounded-full bg-current",
            size === "xs" ? "h-3 w-3" : "",
            size === "sm" ? "h-4 w-4" : "",
            size === "md" ? "h-6 w-6" : "",
            size === "lg" ? "h-8 w-8" : "",
            size === "xl" ? "h-12 w-12" : "",
            !size && "h-6 w-6"
          )}
        />
        {label && <span className="sr-only">{label}</span>}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={label || "Loading"}
      className={cn(spinnerVariants({ size, variant }), className)}
      {...props}
    >
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}