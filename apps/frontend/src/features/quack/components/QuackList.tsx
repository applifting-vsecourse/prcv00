import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"
import { toMatchTerm } from "@/features/quack/lib/quackSearch"

type QuackListProps = {
  quacks: Quack[]
  isLoading?: boolean
  error?: Error
  onReload?: () => void
  // The search these quacks are the results of, as the user typed it.
  search?: string
  onClearSearch?: () => void
}

export function QuackList({
  quacks,
  isLoading,
  error,
  onReload,
  search: rawSearch,
  onClearSearch,
}: QuackListProps) {
  const highlight = rawSearch ? toMatchTerm(rawSearch) : ""
  // A lone "@" filters nothing on the server, so it is not a search here either.
  const search = highlight ? rawSearch : undefined
  const isEmpty = !isLoading && !error && quacks.length === 0

  return (
    <div className="flex flex-col">
      {isLoading && quacks.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : null}

      {error ? (
        <Alert
          variant="destructive"
          className="mb-4"
        >
          <AlertTitle>Couldn&apos;t load quacks</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            {onReload ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
              >
                <RefreshCw className="size-4" />
                Reload
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {search && !error && quacks.length > 0 ? (
        <p className="mb-2 text-sm text-muted-foreground">
          {quacks.length} {quacks.length === 1 ? "quack matches" : "quacks match"} “{search}”
        </p>
      ) : null}

      {isEmpty && search ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-muted-foreground">No quacks match “{search}”.</p>
          {onClearSearch ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSearch}
            >
              Clear search
            </Button>
          ) : null}
        </div>
      ) : null}

      {isEmpty && !search ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No quacks yet. Post the first one.
        </p>
      ) : null}

      {quacks.map((quack) => (
        <QuackItem
          key={quack.id}
          quack={quack}
          highlight={highlight || undefined}
        />
      ))}
    </div>
  )
}
