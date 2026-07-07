import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "btn-interactive inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-gradient-to-b from-[#3d8f55] to-primary text-primary-foreground shadow-[var(--ct-shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--ct-shadow-hover)] active:translate-y-px": variant === "default",
            "bg-[#c53030] text-destructive-foreground hover:bg-[#e53e3e] hover:-translate-y-0.5 hover:shadow-[var(--ct-shadow-sm)] border border-[#c53030]/80": variant === "destructive",
            "border border-input bg-background hover:border-[var(--ct-border-hover)] hover:bg-accent/50 hover:text-accent-foreground": variant === "outline",
            "bg-secondary text-secondary-foreground hover:border-[var(--ct-border-hover)] hover:bg-secondary/80": variant === "secondary",
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
            "text-primary underline-offset-4 hover:underline": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
