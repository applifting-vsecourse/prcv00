import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { HighlightedText } from "@/features/quack/components/HighlightedText"
import { PollView } from "@/features/quack/components/PollView"
import { QuackMoodBadge } from "@/features/quack/components/QuackMoodBadge"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

type QuackItemProps = {
  quack: Quack
  highlight?: string
  // The signed-in user, to tell whether they may close a question.
  currentUserId?: string
  // A static preview (welcome page): questions show results but can't be voted on.
  isReadOnly?: boolean
}

export function QuackItem({ quack, highlight, currentUserId, isReadOnly }: QuackItemProps) {
  const { name, username } = quack.user

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
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
        <p className="text-sm break-words whitespace-pre-line">
          <HighlightedText
            text={quack.text}
            term={highlight}
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
                isAuthor={quack.userId === currentUserId}
              />
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}
