"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
}

interface TooltipTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
}

const TooltipProvider = ({ children }: TooltipProps) => {
  return <>{children}</>
}

const Tooltip = ({ children }: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false)
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === TooltipContent) {
            return React.cloneElement(child, { 
              ...child.props, 
              isVisible 
            } as any)
          }
        }
        return child
      })}
    </div>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  TooltipTriggerProps
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref,
    } as any)
  }
  
  return (
    <span ref={ref as any} {...props}>
      {children}
    </span>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps & { isVisible?: boolean }
>(({ className, children, isVisible, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95",
      "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
      isVisible ? "block" : "hidden",
      className
    )}
    {...props}
  >
    {children}
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-primary" />
  </div>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
