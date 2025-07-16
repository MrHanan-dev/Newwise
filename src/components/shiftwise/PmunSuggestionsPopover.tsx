
import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Wand2 } from 'lucide-react';

interface PmunSuggestionsPopoverProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  isLoading: boolean;
  onFetchSuggestions: () => void;
  disabled?: boolean;
}

export function PmunSuggestionsPopover({
  suggestions,
  onSelectSuggestion,
  isLoading,
  onFetchSuggestions,
  disabled,
}: PmunSuggestionsPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && suggestions.length === 0 && !isLoading) {
      onFetchSuggestions();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => !open && onFetchSuggestions()}
          disabled={isLoading || disabled}
          className="ml-2 text-xs h-10 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground"
          aria-label="Suggest PMUN"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-1" />
          )}
          Suggest
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Filter suggestions..." />
          <CommandList>
            {isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                Loading suggestions...
              </div>
            )}
            {!isLoading && suggestions.length === 0 && (
              <CommandEmpty>No suggestions found.</CommandEmpty>
            )}
            {!isLoading && suggestions.length > 0 && (
              <CommandGroup heading="Suggestions">
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${suggestion}-${index}`}
                    value={suggestion}
                    onSelect={() => {
                      onSelectSuggestion(suggestion);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
