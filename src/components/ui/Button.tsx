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
          // Micro-interactions — translateY up on hover, scale+translate on click
          "transition-[transform,box-shadow,background-color,border-color,color] duration-[180ms] ease-out",
          "active:translate-y-px active:shadow-none active:scale-[0.98]",
          // Variants
          variant === "default" && "bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md",
          variant === "destructive" && "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-md",
          variant === "outline" && "border border-input bg-background hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
          variant === "secondary" && "bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-secondary/80 hover:shadow-md",
          variant === "ghost" && "border border-transparent hover:border-primary hover:bg-transparent hover:text-inherit hover:shadow-none hover:translate-y-0",
          variant === "link" && "text-primary underline-offset-4 hover:underline hover:shadow-none hover:translate-y-0",
          // Sizes
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-9 rounded-md px-3",
          size === "lg" && "h-11 rounded-md px-8",
          size === "icon" && "h-10 w-10",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
