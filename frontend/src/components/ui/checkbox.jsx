import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  const handleClick = () => {
    if (onCheckedChange) {
      onCheckedChange(!checked)
    }
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      ref={ref}
      onClick={handleClick}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-900 data-[state=checked]:text-slate-50",
        checked && "bg-slate-900 text-slate-50",
        className
      )}
      {...props}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
