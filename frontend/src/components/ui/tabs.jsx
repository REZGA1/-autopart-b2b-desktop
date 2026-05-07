import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext(null)

function Tabs({ value, onValueChange, children, className, ...props }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function TabsTrigger({ value, className, children, ...props }) {
  const context = React.useContext(TabsContext)
  const isActive = context?.value === value

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white text-slate-900 shadow-sm"
          : "hover:bg-slate-200/50 hover:text-slate-700",
        className
      )}
      onClick={() => context?.onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, className, children, ...props }) {
  const context = React.useContext(TabsContext)
  const isActive = context?.value === value

  if (!isActive) return null

  return (
    <div
      className={cn("mt-2 focus-visible:outline-none", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
