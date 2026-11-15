import { Link } from "@tanstack/react-router"
import { MessageCircle } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/date"
import { cn } from "@/lib/utils"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { DeleteQuackButton } from "@/features/quack/components/DeleteQuackButton"
import { PollView } from "@/features/quack/components/PollView"
import { QuackMoodBadge } from "@/features/quack/components/QuackMoodBadge"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { QuackText } from "@/features/quack/components/QuackText"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

type QuackItemProps = {
  quack: Quack
  highlight?: string
  // The signed-in user, to tell whether they may close a question.
  currentUserId?: string
  // The signed-in user is an admin, so they may delete anyone's quack.
  isAdmin?: boolean
  // A static preview (welcome page): questions show results but can't be voted on.
  isReadOnly?: boolean
  // In a list (the feed, Mine, search): a conversation start links to its
  // conversation (reply count, Reply), a reply says whose conversation it is in.
  hasConversationLinks?: boolean
  // On the conversation page: says who a reply answers. Reply is offered
  // through onReply there.
  isInConversation?: boolean
  onReply?: () => void
  // The reply a link from Mine or search pointed at.
  isHighlighted?: boolean
}

export const quackElementId = (quackId: string) => `quack-${quackId}`

const replyCountLabel = (count: number) => (count === 1 ? "1 reply" : `${count} replies`)

export function QuackItem({
  quack,
  highlight,
  currentUserId,
  isAdmin,
  isReadOnly,
  hasConversationLinks,
  isInConversation,
  onReply,
  isHighlighted,
}: QuackItemProps) {
  const articleClassName = cn(
    "flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0",
    isHighlighted && "rounded-md bg-secondary px-2",
  )

  // A deleted quack kept only because people replied to it: nothing of it
  // is left to show, and nothing can be done with it (docs/adr/0002).
  if (quack.isDeleted || !quack.user || quack.text === null) {
    return (
      <article
        id={quackElementId(quack.id)}
        className={articleClassName}
      >
        <Avatar className="size-12">
          <AvatarFallback aria-hidden="true" />
        </Avatar>
        <div className="flex flex-1 flex-col gap-1 pt-3">
          <p className="text-sm text-muted-foreground">This quack was deleted.</p>
          {hasConversationLinks && quack.replyCount > 0 ? (
            <ConversationLinks quack={quack} />
          ) : null}
        </div>
      </article>
    )
  }

  const { name, username } = quack.user
  // The server decides for real (403 otherwise); this only decides what to offer.
  const isAuthor = currentUserId !== undefined && quack.userId === currentUserId
  const canDelete = (isAuthor || isAdmin === true) && !isReadOnly
  const isReply = quack.parentId !== null

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article
      id={quackElementId(quack.id)}
      className={articleClassName}
    >
      <Avatar className="size-12">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName
              name={name}
              highlight={highlight}
            />{" "}
            <UsersUserName
              username={username}
              highlight={highlight}
            />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
          {quack.mood ? (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <QuackMoodBadge mood={quack.mood} />
            </>
          ) : null}
        </div>
        {isReply && isInConversation ? (
          <p className="text-xs text-muted-foreground">
            {quack.replyTo
              ? `in reply to @${quack.replyTo.username}`
              : "in reply to a deleted quack"}
          </p>
        ) : null}
        {isReply && hasConversationLinks && quack.root ? (
          <Link
            to="/quacks/$quackId"
            params={{ quackId: quack.root.id }}
            search={{ reply: quack.id }}
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            {quack.root.user
              ? `Reply in a conversation by @${quack.root.user.username}`
              : "Reply in a conversation whose quack was deleted"}
          </Link>
        ) : null}
        <p className="text-sm break-words whitespace-pre-line">
          <QuackText
            text={quack.text}
            highlight={highlight}
            shouldLinkHashtags={!isReadOnly}
          />
        </p>
        {quack.poll ? (
          <div className="mt-2">
            {isReadOnly ? (
              <PollView
                poll={quack.poll}
                highlight={highlight}
              />
            ) : (
              <QuackPoll
                poll={quack.poll}
                highlight={highlight}
                isAuthor={isAuthor}
              />
            )}
          </div>
        ) : null}
        {canDelete || onReply || (hasConversationLinks && !isReply) ? (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {hasConversationLinks && !isReply ? <ConversationLinks quack={quack} /> : null}
            {onReply ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Reply to @${username}`}
                onClick={onReply}
              >
                <MessageCircle aria-hidden="true" />
                Reply
              </Button>
            ) : null}
            {canDelete ? (
              <DeleteQuackButton
                quackId={quack.id}
                author={isAuthor ? undefined : quack.user}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

// In a list, a conversation start leads to its conversation: the reply
// count (when there are replies) and Reply, which opens the reply box there.
function ConversationLinks({ quack }: { quack: Quack }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {quack.replyCount > 0 ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link
            to="/quacks/$quackId"
            params={{ quackId: quack.id }}
          >
            {replyCountLabel(quack.replyCount)}
          </Link>
        </Button>
      ) : null}
      {quack.isDeleted ? null : (
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link
            to="/quacks/$quackId"
            params={{ quackId: quack.id }}
            search={{ compose: true }}
            aria-label={quack.user ? `Reply to @${quack.user.username}` : "Reply"}
          >
            <MessageCircle aria-hidden="true" />
            Reply
          </Link>
        </Button>
      )}
    </div>
  )
}
