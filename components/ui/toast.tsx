"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { cn } from "cn"
import { XIcon } from "lucide-react"

const ToastProvider = ToastPrimitive.Provider

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed top-auto right-4 bottom-4 z-[100] w-[calc(100%-2rem)] max-w-sm outline-none sm:right-6 sm:bottom-6",
        className
      )}
      {...props}
    />
  )
}

function ToastRoot({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "taskora-surface-elevated absolute right-0 bottom-0 left-0 rounded-xl bg-popover p-3.5 text-popover-foreground ring-1 ring-foreground/10 transition-all duration-200 ease-out select-none",
        "translate-y-(--toast-offset-y) scale-(--toast-scale)",
        "data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        "data-[swiping]:transition-none",
        className
      )}
      style={{
        zIndex: "calc(1000 - var(--toast-index))",
        // Base UI sets --toast-index (0 = frontmost); a subtle scale-down
        // per layer gives the stack visible depth without needing custom JS.
        ["--toast-scale" as string]: "calc(1 - var(--toast-index) * 0.06)",
      }}
      {...props}
    />
  )
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return <ToastPrimitive.Content data-slot="toast-content" className={cn("flex flex-col gap-0.5 pr-5", className)} {...props} />
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  )
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("line-clamp-2 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ToastClose({ className, ...props }: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Dismiss"
      className={cn(
        "absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      <XIcon className="size-3.5" />
    </ToastPrimitive.Close>
  )
}

export {
  ToastProvider,
  ToastPortal,
  ToastViewport,
  ToastRoot,
  ToastContent,
  ToastTitle,
  ToastDescription,
  ToastClose,
}
export const useToastManager = ToastPrimitive.useToastManager
