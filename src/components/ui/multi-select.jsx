import React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function MultiSelect({ 
  value = [], 
  onValueChange, 
  options = [], 
  placeholder = "Select options...", 
  searchPlaceholder = "Search...",
  className = ""
}) {
  const [open, setOpen] = React.useState(false);

  const safeOptions = Array.isArray(options) ? options : [];
  const safeValue = Array.isArray(value) ? value : [];

  const handleSelect = (selectedValue) => {
    const newValue = safeValue.includes(selectedValue)
      ? safeValue.filter((v) => v !== selectedValue)
      : [...safeValue, selectedValue];
    onValueChange(newValue);
  };

  const handleRemove = (valueToRemove) => {
    onValueChange(safeValue.filter((v) => v !== valueToRemove));
  };

  const selectedLabels = safeValue
    .map((v) => safeOptions.find((opt) => opt.value === v)?.label)
    .filter(Boolean);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex gap-1 flex-wrap">
            {safeValue.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : safeValue.length === 1 ? (
              <span>{selectedLabels[0]}</span>
            ) : (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {safeValue.length} ausgewählt
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {safeOptions.map((option) => {
              const isSelected = safeValue.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
        {safeValue.length > 0 && (
          <div className="border-t p-2">
            <div className="flex flex-wrap gap-1">
              {selectedLabels.map((label, index) => (
                <Badge
                  key={safeValue[index]}
                  variant="secondary"
                  className="rounded-sm px-1 font-normal"
                >
                  {label}
                  <button
                    className="ml-1 rounded-sm hover:bg-muted"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(safeValue[index]);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onValueChange([]);
              }}
            >
              Alle abwählen
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}