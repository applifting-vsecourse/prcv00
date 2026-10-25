import { useCallback, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useSession } from "@/features/auth/hooks/useSession"
import { profileQueryOptions } from "@/features/profile/api/profileQueryOptions"
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
  const { q, tab = "all" } = Route.useSearch()
  const navigate = Route.useNavigate()
  const quacksQuery = useQuery(quacksQueryOptions(q, tab === "mine"))
  // Only for the default mood: if it fails to load, posting still works.
  const profileQuery = useQuery(profileQueryOptions())
  const { user } = useSession()
  const newQuackRef = useRef<HTMLTextAreaElement>(null)

  // Both push a history entry, so Back steps through earlier searches and
  // tabs. Each keeps the other: searching stays on the tab, and vice versa.
  const setSearch = useCallback(
    (term: string) => void navigate({ search: (prev) => ({ ...prev, q: term || undefined }) }),
    [navigate],
  )
  const setTab = useCallback(
    (value: string) =>
      void navigate({
        search: (prev) => ({ ...prev, tab: value === "mine" ? ("mine" as const) : undefined }),
      }),
    [navigate],
  )

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm
          className="mb-4"
          defaultMood={profileQuery.data?.defaultQuackMood}
          textRef={newQuackRef}
        />

        <Tabs
          value={tab}
          onValueChange={setTab}
          className="gap-4"
        >
          <TabsList aria-label="Which quacks to show">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
          </TabsList>

          {/* One panel for whichever tab is active: both show the same feed,
              only filtered differently. */}
          <TabsContent value={tab}>
            <QuackSearch
              className="mb-4"
              value={q ?? ""}
              onSearch={setSearch}
              isSearching={quacksQuery.isPlaceholderData}
            />

            <QuackList
              quacks={quacksQuery.data?.quacks ?? []}
              search={quacksQuery.data?.search}
              isMine={quacksQuery.data?.isMine ?? tab === "mine"}
              isLoading={quacksQuery.isLoading}
              error={quacksQuery.error ?? undefined}
              // Only the error state offers a retry — posting invalidates the list,
              // and refocusing the tab refetches it.
              onReload={() => void quacksQuery.refetch()}
              onClearSearch={() => setSearch("")}
              onWriteFirst={() => newQuackRef.current?.focus()}
              currentUserId={user?.id}
            />
          </TabsContent>
        </Tabs>
      </section>
    </>
  )
}
