import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { HighlightedText } from "@/features/quack/components/HighlightedText"
import { QuackMoodBadge } from "@/features/quack/components/QuackMoodBadge"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

type QuackItemProps = {
  quack: Quack
  highlight?: string
}

export function QuackItem({ quack, highlight }: QuackItemProps) {
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
      </div>
    </article>
  )
}
