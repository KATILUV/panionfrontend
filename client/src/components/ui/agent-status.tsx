import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Play, Pause, Clock, BrainCircuit } from "lucide-react";

/**
 * Agent status types inspired by Frame.io's consistent color status system
 */
export type AgentStatusType = 
  | "idle"      // Agent is inactive but ready
  | "thinking"  // Agent is processing information
  | "active"    // Agent is actively performing tasks
  | "paused"    // Agent has been paused by user
  | "error"     // Agent has encountered an error
  | "success"   // Agent has successfully completed a task
  | "waiting"   // Agent is waiting for user input or external data
  | "learning"; // Agent is in learning/training mode

interface AgentStatusProps {
  status: AgentStatusType;
  label?: string;
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  pulsingAnimation?: boolean;
}

/**
 * AgentStatus component
 * 
 * Displays a consistent visual indicator of an agent's current state
 * Uses color, icon, and optional animation to convey status at a glance
 */
export function AgentStatus({
  status,
  label,
  className,
  showIcon = true,
  showLabel = true,
  size = "md",
  pulsingAnimation = true,
}: AgentStatusProps) {
  // Determine icon based on status
  const getIcon = () => {
    switch (status) {
      case "idle":
        return <Clock className={iconClass} />;
      case "thinking":
        return <BrainCircuit className={iconClass} />;
      case "active":
        return <Play className={iconClass} />;
      case "paused":
        return <Pause className={iconClass} />;
      case "error":
        return <AlertCircle className={iconClass} />;
      case "success":
        return <CheckCircle2 className={iconClass} />;
      case "waiting":
        return <Loader2 className={cn(iconClass, "animate-spin")} />;
      case "learning":
        return <BrainCircuit className={iconClass} />;
      default:
        return null;
    }
  };

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-xs py-0 px-1";
      case "lg":
        return "text-sm py-1 px-3";
      default: // "md"
        return "text-xs py-0.5 px-2";
    }
  };

  // Icon size classes
  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "h-3 w-3";
      case "lg":
        return "h-5 w-5";
      default: // "md"
        return "h-4 w-4";
    }
  };

  const iconClass = cn("mr-1", getIconSize());
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);
  
  // Status-specific styling (variant will be from badge.tsx variants)
  const getStatusVariant = () => {
    switch (status) {
      case "idle":
        return "secondary";
      case "thinking":
        return "purple";
      case "active":
        return "default";
      case "paused":
        return "outline";
      case "error":
        return "destructive";
      case "success":
        return "green";
      case "waiting":
        return "blue";
      case "learning":
        return "pink";
      default:
        return "secondary";
    }
  };

  // Pulsing animation class
  const getPulsingClass = () => {
    if (!pulsingAnimation) return "";
    
    switch (status) {
      case "thinking":
      case "active":
      case "waiting":
      case "learning":
        return "animate-pulse";
      default:
        return "";
    }
  };

  return (
    <Badge
      variant={getStatusVariant()}
      className={cn(
        getSizeClasses(),
        getPulsingClass(),
        "font-medium flex items-center whitespace-nowrap",
        className
      )}
    >
      {showIcon && getIcon()}
      {showLabel && <span>{displayLabel}</span>}
    </Badge>
  );
}