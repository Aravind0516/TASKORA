"use client";

import { useRef, type ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NativeInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "className">;

interface SearchInputProps extends NativeInputProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name — required because the placeholder disappears as soon as the user types. */
  "aria-label": string;
  /** Sizing/placement of the whole control (width, max-width, flex behavior). */
  className?: string;
  /** Extra classes for the <input> itself — rarely needed. */
  inputClassName?: string;
}

/**
 * The one search field used across TASKORA — global and page-local searches
 * alike render through this, so height, text centering, icon placement and
 * the clear button are identical everywhere.
 *
 * Why it exists: every search bar used to hand-roll its own icon wrapper
 * around the shared shadcn <Input>, inheriting that input's compact h-8
 * (32px). Below the md breakpoint the input switches to a 16px font (to stop
 * iOS Safari zooming on focus) whose 24px line box needs more room than the
 * 22px left inside a 32px border-box with its 1px borders and 4px vertical
 * padding — so typed text overflowed its line box and was clipped/shifted
 * against the content below. A 40px control leaves 30px of content height,
 * enough for both the 16px mobile and 14px desktop text sizes.
 */
export function SearchInput({ value, onValueChange, className, inputClassName, placeholder = "Search...", ...inputProps }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative w-full min-w-0 shrink-0", className)}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "h-10 pr-9 pl-9 leading-normal",
          // The browser's own cancel "×" would duplicate the clear button below.
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
          inputClassName
        )}
        {...inputProps}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
