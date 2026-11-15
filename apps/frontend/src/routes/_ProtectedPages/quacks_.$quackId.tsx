import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"

import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { useSession } from "@/features/auth/hooks/useSession"
import { conversationQueryOptions } from "@/features/quack/api/conversationQueryOptions"
import { Conversation } from "@/features/quack/components/Conversation"
import { parseConversationSearch } from "@/features/quack/lib/conversationSearch"
import { buildConversationTree } from "@/features/quack/lib/conversationTree"

// /quacks/<id>: the conversation a quack starts. The trailing "_" in the
// file name keeps it a page of its own instead of nesting it in the feed.
export const Route = createFileRoute("/_ProtectedPages/quacks_/$quackId")({
  validateSearch: parseConversationSearch,
  component: ConversationPage,
})

function ConversationPage() {
  const { quackId } = Route.useParams()
  const { reply, compose: shouldCompose } = Route.useSearch()
  const conversationQuery = useQuery(conversationQueryOptions(quackId))
  const { user } = useSession()
  const root = useMemo(
    () => (conversationQuery.data ? buildConversationTree(conversationQuery.data) : undefined),
    [conversationQuery.data],
  )
  const isGone = conversationQuery.data === null || (conversationQuery.data && !root)

  return (
    <>
      <Seo title="Conversation" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4"
        >
          <Link to="/quacks">
            <ArrowLeft aria-hidden="true" />
            All quacks
          </Link>
        </Button>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Conversation</h1>

        {conversationQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : null}

        {conversationQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t load the conversation</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{conversationQuery.error.message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void conversationQuery.refetch()}
              >
                <RefreshCw className="size-4" />
                Reload
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {isGone ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground">This conversation no longer exists.</p>
            <Button
              asChild
              variant="outline"
              size="sm"
            >
              <Link to="/quacks">Back to the feed</Link>
            </Button>
          </div>
        ) : null}

        {root ? (
          <Conversation
            root={root}
            currentUserId={user?.id}
            isAdmin={user?.role === "admin"}
            highlightId={reply}
            shouldFocusReply={shouldCompose === true}
          />
        ) : null}
      </section>
    </>
  )
}
