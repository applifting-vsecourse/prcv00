import { Loader2 } from "lucide-react"
import { useEffect, useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { SEARCH_MAX_LENGTH } from "@/features/quack/lib/quackSearch"

export const SEARCH_DEBOUNCE_MS = 300

type QuackSearchProps = {
  // The active search (from the URL), already trimmed.
  value: string
  onSearch: (term: string) => void
  isSearching?: boolean
  className?: string
}

export function QuackSearch({ value, onSearch, isSearching, className }: QuackSearchProps) {
  const inputId = useId()
  const [draft, setDraft] = useState(value)

  // The search can change without typing — Back button, "Clear search". Show
  // it in the input, unless it is just the trimmed echo of what is being typed
  // (otherwise "pond " would lose its space before the user types "duck").
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (value !== draft.trim()) setDraft(value)
  }

  useEffect(() => {
    const term = draft.trim()
    if (term === value) return
    const timeout = setTimeout(() => onSearch(term), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [draft, value, onSearch])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={inputId}>Search quacks</Label>
      <div className="relative">
        <Input
          id={inputId}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={SEARCH_MAX_LENGTH}
          placeholder="e.g. pond or @alice"
          className="pr-9"
        />
        <div
          role="status"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground"
        >
          {isSearching ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span className="sr-only">Searching…</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
