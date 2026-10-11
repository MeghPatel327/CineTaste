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
          // Base
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "transition-[transform,box-shadow,background-color,border-color,color] duration-[180ms] ease-out",
          "active:translate-y-px active:scale-[0.98] active:shadow-none",

          // ── default (primary green) ──
          variant === "default" && [
            "bg-primary text-primary-foreground",
            "shadow-[0_2px_8px_rgba(46,111,64,0.35),0_1px_3px_rgba(0,0,0,0.20)]",
            "hover:-translate-y-0.5 hover:bg-primary/90",
            "hover:shadow-[0_6px_20px_rgba(46,111,64,0.55),0_2px_8px_rgba(0,0,0,0.25)]",
          ],

          // ── destructive (red) ──
          variant === "destructive" && [
            "bg-destructive text-destructive-foreground",
            "shadow-[0_2px_8px_rgba(239,68,68,0.35),0_1px_3px_rgba(0,0,0,0.20)]",
            "hover:-translate-y-0.5 hover:bg-destructive/90",
            "hover:shadow-[0_6px_20px_rgba(239,68,68,0.55),0_2px_8px_rgba(0,0,0,0.25)]",
          ],

          // ── outline ──
          variant === "outline" && [
            "border border-input bg-background",
            "shadow-[0_1px_4px_rgba(0,0,0,0.15)]",
            "hover:-translate-y-0.5 hover:border-primary",
            "hover:shadow-[0_4px_14px_rgba(46,111,64,0.30),0_1px_4px_rgba(0,0,0,0.18)]",
          ],

          // ── secondary ──
          variant === "secondary" && [
            "bg-secondary text-secondary-foreground",
            "shadow-[0_1px_4px_rgba(0,0,0,0.18)]",
            "hover:-translate-y-0.5 hover:bg-secondary/80",
            "hover:shadow-[0_4px_14px_rgba(0,0,0,0.28),0_1px_4px_rgba(0,0,0,0.18)]",
          ],

          // ── ghost — no shadow ──
          variant === "ghost" && [
            "border border-transparent",
            "hover:border-primary hover:bg-transparent hover:text-inherit",
            "hover:translate-y-0 hover:shadow-none",
          ],

          // ── link — no shadow ──
          variant === "link" && [
            "text-primary underline-offset-4",
            "hover:underline hover:translate-y-0 hover:shadow-none",
          ],

          // Sizes
          size === "default" && "h-10 px-4 py-2",
          size === "sm"      && "h-9 rounded-md px-3",
          size === "lg"      && "h-11 rounded-md px-8",
          size === "icon"    && "h-10 w-10",

          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
