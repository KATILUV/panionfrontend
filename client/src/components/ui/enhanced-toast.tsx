import { Toast, ToastClose, ToastDescription, ToastProps, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { Icon } from "@/components/ui/icon-provider";
import { ICONS } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface IconMap {
  [key: string]: string;
}

const TOAST_ICONS: IconMap = {
  default: ICONS.INFO,
  success: ICONS.CHECK_CIRCLE,
  error: ICONS.ALERT_CIRCLE,
  warning: ICONS.ALERT_TRIANGLE,
  info: ICONS.INFO,
  loading: ICONS.LOADER,
};

export function EnhancedToast({ className, ...props }: ToastProps) {
  // Determine the appropriate icon based on the variant
  const variant = props.variant || "default";
  const iconName = TOAST_ICONS[variant] || TOAST_ICONS.default;
  
  return (
    <Toast className={cn("group", className)} {...props}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          {variant === "loading" ? (
            <div className="animate-spin">
              <Icon name={iconName} size="sm" className="text-primary" />
            </div>
          ) : (
            <Icon 
              name={iconName} 
              size="sm" 
              className={cn(
                variant === "success" && "text-green-500",
                variant === "error" && "text-red-500",
                variant === "warning" && "text-yellow-500",
                variant === "info" && "text-blue-500",
                variant === "default" && "text-primary",
              )} 
            />
          )}
        </div>
        
        <div className="flex-1 space-y-1">
          {props.title && <ToastTitle>{props.title}</ToastTitle>}
          {props.description && (
            <ToastDescription>{props.description}</ToastDescription>
          )}
        </div>
      </div>
      <ToastClose />
    </Toast>
  );
}

export function EnhancedToaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      <AnimatePresence>
        {toasts.map(({ id, title, description, action, ...props }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <EnhancedToast
              id={id}
              title={title}
              description={description}
              action={action}
              {...props}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      <ToastViewport />
    </ToastProvider>
  );
}