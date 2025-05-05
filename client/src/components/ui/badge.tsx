import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // New variants for agent status indicators inspired by Frame.io
        purple: "border-transparent bg-purple-600 text-white hover:bg-purple-700",
        blue: "border-transparent bg-blue-600 text-white hover:bg-blue-700",
        green: "border-transparent bg-green-600 text-white hover:bg-green-700",
        pink: "border-transparent bg-pink-600 text-white hover:bg-pink-700",
        amber: "border-transparent bg-amber-500 text-white hover:bg-amber-600",
        slate: "border-transparent bg-slate-700 text-white hover:bg-slate-800",
        // Subtle variants with lower opacity backgrounds
        "purple-subtle": "border-transparent bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/30",
        "blue-subtle": "border-transparent bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30",
        "green-subtle": "border-transparent bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30",
        "pink-subtle": "border-transparent bg-pink-500/20 text-pink-700 dark:text-pink-300 hover:bg-pink-500/30",
        "amber-subtle": "border-transparent bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30",
        "slate-subtle": "border-transparent bg-slate-500/20 text-slate-700 dark:text-slate-300 hover:bg-slate-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
