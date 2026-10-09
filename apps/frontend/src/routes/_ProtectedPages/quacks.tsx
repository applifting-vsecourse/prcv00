import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { parseQuacksSearch } from "@/features/quack/lib/quackSearch"

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  // The search lives in the URL so refresh, Back and shared links keep it.
  validateSearch: parseQuacksSearch,
  component: QuacksPage,
})

function QuacksPage() {
  const { q } = Route.useSearch()
  const navigate = Route.useNavigate()
  const quacksQuery = useQuery(quacksQueryOptions(q))

  // Pushes a history entry per search, so Back steps through earlier searches.
  const setSearch = useCallback(
    (term: string) => void navigate({ search: term ? { q: term } : {} }),
    [navigate],
  )

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm className="mb-4" />

        <QuackSearch
          className="mb-4"
          value={q ?? ""}
          onSearch={setSearch}
          isSearching={quacksQuery.isPlaceholderData}
        />

        <QuackList
          quacks={quacksQuery.data?.quacks ?? []}
          search={quacksQuery.data?.search}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
          onClearSearch={() => setSearch("")}
        />
      </section>
    </>
  )
}
