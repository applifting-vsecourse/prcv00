import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { quackElementId, QuackItem } from "@/features/quack/components/QuackItem"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import type { ConversationNode } from "@/features/quack/lib/conversationTree"

// Indenting stops here on a phone, so a deep conversation stays readable;
// "in reply to @name" still says who a deeper reply answers.
const PHONE_INDENT_LEVELS = 4

type ConversationProps = {
  root: ConversationNode
  currentUserId?: string
  isAdmin?: boolean
  // The reply to scroll to and highlight (a link from Mine or search).
  highlightId?: string
  // Put the cursor in the reply box under the conversation start.
  shouldFocusReply?: boolean
}

// Moves the focus to a quack once it is on screen (after the refetch that
// brings a just-posted reply).
function useFocusQuack(): (quackId: string) => void {
  const pendingIdRef = useRef<string>(undefined)
  // After every render: the reply arrives with a refetch, not with the call.
  useEffect(() => {
    if (!pendingIdRef.current) return
    const element = document.getElementById(quackElementId(pendingIdRef.current))
    if (!element) return
    element.tabIndex = -1
    element.focus()
    pendingIdRef.current = undefined
  })
  return (quackId) => {
    pendingIdRef.current = quackId
  }
}

export function Conversation({
  root,
  currentUserId,
  isAdmin,
  highlightId,
  shouldFocusReply,
}: ConversationProps) {
  // At most one open reply box under a reply; the one under the start stays.
  const [replyingToId, setReplyingToId] = useState<string>()
  const focusQuack = useFocusQuack()

  useEffect(() => {
    if (!highlightId) return
    const element = document.getElementById(quackElementId(highlightId))
    element?.scrollIntoView({ block: "center" })
    // Read in the order of the page from here on, not from the top.
    if (element) element.tabIndex = -1
    element?.focus({ preventScroll: true })
  }, [highlightId])

  const handlePosted = (reply: Quack) => {
    setReplyingToId(undefined)
    focusQuack(reply.id)
  }

  const renderNodes = (nodes: ConversationNode[], depth: number) => (
    <ol
      className={cn(
        "flex flex-col border-l border-border",
        depth <= PHONE_INDENT_LEVELS ? "pl-3 sm:pl-6" : "border-l-0 sm:border-l sm:pl-6",
      )}
    >
      {nodes.map(({ quack, replies }) => (
        <li key={quack.id}>
          <QuackItem
            quack={quack}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isInConversation
            isHighlighted={quack.id === highlightId}
            onReply={quack.isDeleted ? undefined : () => setReplyingToId(quack.id)}
          />
          {replyingToId === quack.id && quack.user ? (
            <ReplyForm
              className="mb-4"
              parentId={quack.id}
              replyToUsername={quack.user.username}
              onPosted={handlePosted}
              onCancel={() => setReplyingToId(undefined)}
              shouldFocus
            />
          ) : null}
          {replies.length > 0 ? renderNodes(replies, depth + 1) : null}
        </li>
      ))}
    </ol>
  )

  return (
    <div className="flex flex-col gap-4">
      <QuackItem
        quack={root.quack}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        isInConversation
      />
      {root.quack.user && !root.quack.isDeleted ? (
        <ReplyForm
          parentId={root.quack.id}
          replyToUsername={root.quack.user.username}
          onPosted={handlePosted}
          shouldFocus={shouldFocusReply}
        />
      ) : null}
      {root.replies.length > 0 ? (
        renderNodes(root.replies, 1)
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No replies yet. Be the first.
        </p>
      )}
    </div>
  )
}
