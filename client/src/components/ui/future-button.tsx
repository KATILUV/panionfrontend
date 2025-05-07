import * as React from "react";
import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface FutureButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "outline" | "ghost" | "accent";
  size?: "default" | "sm" | "lg" | "icon";
  gradient?: boolean;
  glow?: boolean;
  neonBorder?: boolean;
  className?: string;
  children: React.ReactNode;
}

const buttonVariants = cva(
  "relative overflow-hidden border inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out font-medium will-change-transform backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-black/30 hover:bg-black/40 text-white border-white/10",
        primary: "bg-primary hover:bg-primary-hover text-primary-foreground border-primary/20",
        outline: "bg-transparent border-white/20 hover:bg-white/5 text-foreground",
        ghost: "bg-transparent hover:bg-white/5 text-foreground border-transparent",
        accent: "bg-accent hover:bg-accent/90 text-accent-foreground border-accent/20",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm rounded-md",
        sm: "h-8 px-3 py-1.5 text-xs rounded-md",
        lg: "h-12 px-6 py-3 text-base rounded-lg",
        icon: "h-10 w-10 p-2 rounded-full",
      },
      gradient: {
        true: "bg-gradient-to-r",
      },
      glow: {
        true: "shadow-glow",
      },
      neonBorder: {
        true: "neon-border",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Enhanced button component with modern visual effects and micro-interactions
 */
const FutureButton = forwardRef<HTMLButtonElement, FutureButtonProps>(
  ({ 
    children, 
    variant = "default", 
    size = "default",
    gradient = false,
    glow = false,
    neonBorder = false,
    className,
    ...props 
  }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({ 
            variant, 
            size, 
            gradient,
            glow,
            neonBorder,
            className 
          })
        )}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98, y: 1 }}
        {...props}
      >
        {/* Button content with proper spacing and alignment */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
        
        {/* Interactive shine effect on hover */}
        <motion.span 
          className="absolute inset-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-100"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
            left: "-100%",
          }}
          animate={{
            left: ["0%", "100%"]
          }}
          transition={{
            duration: 0.7,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        />
      </motion.button>
    );
  }
);

FutureButton.displayName = "FutureButton";

export { FutureButton };