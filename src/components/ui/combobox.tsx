
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyResultText?: string;
  className?: string;
  trigger?: React.ReactNode;
}

export function Combobox({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option...", 
  searchPlaceholder = "Search...",
  emptyResultText = "No results found.",
  className,
  trigger
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const popoverTrigger = trigger || (
    <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between", className)}
      >
        {options.find((option) => option.value === value)?.label || placeholder}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
  );
  
  // Custom filter to search by both label and value (code)
  const customFilter = (itemValue: string, search: string): number => {
    const option = options.find(opt => opt.value === itemValue);
    if (!option) return 0;
    
    const searchLower = search.toLowerCase();
    const labelLower = option.label.toLowerCase();
    const valueLower = option.value.toLowerCase();

    if (labelLower.includes(searchLower) || valueLower.includes(searchLower)) {
      return 1;
    }
    return 0;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {popoverTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command filter={customFilter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyResultText}</CommandEmpty>
            <CommandGroup>
                {options.map((option) => (
                <CommandItem
                    key={option.value}
                    value={option.value} // Use the unique value for the item
                    onSelect={(currentValue) => {
                        onChange(currentValue);
                        setOpen(false)
                    }}
                >
                    <Check
                        className={cn(
                            "mr-2 h-4 w-4",
                            value === option.value ? "opacity-100" : "opacity-0"
                        )}
                    />
                    {option.label}
                </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
