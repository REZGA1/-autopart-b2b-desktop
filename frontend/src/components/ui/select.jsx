import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple native select that works with React 19
// API compatible with shadcn/ui Select

const Select = React.forwardRef(function Select({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}, ref) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const currentValue = isControlled ? value : internalValue

  const handleChange = (e) => {
    const newValue = e.target.value
    if (!isControlled) {
      setInternalValue(newValue)
    }
    if (onValueChange) {
      onValueChange(newValue)
    }
  }

  // Extract only the SelectItem children from SelectContent
  let options = []
  let placeholder = ""

  // Simple children processing without hooks
  const processChild = (child) => {
    if (!child || !React.isValidElement(child)) return

    const type = child.type
    const displayName = type?.displayName || type?.name

    if (displayName === "SelectTrigger") {
      // Extract placeholder from SelectValue inside SelectTrigger
      React.Children.forEach(child.props.children, (triggerChild) => {
        if (!React.isValidElement(triggerChild)) return
        const triggerType = triggerChild.type
        const triggerDisplayName = triggerType?.displayName || triggerType?.name
        if (triggerDisplayName === "SelectValue" && triggerChild.props?.placeholder) {
          placeholder = triggerChild.props.placeholder
        }
      })
    }

    if (displayName === "SelectContent") {
      React.Children.forEach(child.props.children, (optionChild) => {
        if (!React.isValidElement(optionChild)) return
        const optionType = optionChild.type
        const optionDisplayName = optionType?.displayName || optionType?.name
        if (optionDisplayName === "SelectItem" || optionType === SelectItem) {
          options.push(optionChild)
        }
      })
    }
  }

  React.Children.forEach(children, processChild)

  // Add placeholder option
  const hasEmptyValue = options.some(opt => opt.props.value === "" || opt.props.value === undefined)
  if (!hasEmptyValue && placeholder) {
    options.unshift(<option key="__placeholder__" value="">{placeholder}</option>)
  }

  return (
    <div className={cn("relative", className)}>
      <select
        ref={ref}
        value={currentValue}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}>
        {options}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
})
Select.displayName = "Select"

// Dummy components that don't render anything (for API compatibility)
const SelectTrigger = () => null
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = () => null
SelectValue.displayName = "SelectValue"

const SelectContent = ({ children }) => children
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(function SelectItem({ value, children, disabled, className, ...props }, ref) {
  return (
    <option ref={ref} value={value} disabled={disabled} className={className} {...props}>
      {children}
    </option>
  )
})
SelectItem.displayName = "SelectItem"

const SelectGroup = ({ children, label }) => <optgroup label={label}>{children}</optgroup>
SelectGroup.displayName = "SelectGroup"

const SelectLabel = () => null
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = () => <option disabled>─────────</option>
SelectSeparator.displayName = "SelectSeparator"

const SelectScrollUpButton = () => null
const SelectScrollDownButton = () => null

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
