"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  maxSelection?: number;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search items...",
  emptyText = "No items found.",
  className,
  maxSelection,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [buttonWidth, setButtonWidth] = React.useState<number>(0);

  React.useEffect(() => {
    if (buttonRef.current) {
      setButtonWidth(buttonRef.current.offsetWidth);
    }
  }, [open]);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      // If already selected, remove it
      onChange(selected.filter((item) => item !== value));
    } else {
      // If not selected, check maxSelection limit
      if (maxSelection && selected.length >= maxSelection) {
        // Don't add if max selection reached
        return;
      }
      // Add to selection
      onChange([...selected, value]);
    }
  };

  // Fix: Create a proper boolean value for disabled state
  const isOptionDisabled = (optionValue: string) => {
    if (!maxSelection) return false;
    return selected.length >= maxSelection && !selected.includes(optionValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            ref={buttonRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <div className="flex flex-wrap gap-1">
              {selected.length === 0 && placeholder}
              {selected.map((value) => {
                const option = options.find((opt) => opt.value === value);
                return (
                  <div
                    key={value}
                    className="bg-secondary flex items-center gap-1 rounded-md px-1 py-0.5"
                  >
                    <span className="text-sm">{option?.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnselect(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnselect(value);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </div>
                );
              })}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          style={{ width: buttonWidth > 0 ? `${buttonWidth}px` : "auto" }}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto overscroll-contain">
              {options.map((option) => {
                const disabled = isOptionDisabled(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    disabled={disabled}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(option.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                    {disabled && (
                      <span className="ml-auto text-xs text-muted-foreground">Limit reached</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {maxSelection && (
        <div className="text-xs text-muted-foreground">
          {selected.length}/{maxSelection} selected
        </div>
      )}
    </div>
  );
}
