import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { HighlightedText } from "@/features/quack/components/HighlightedText"
import { pollPercentages } from "@/features/quack/lib/pollMath"

type PollViewProps = {
  poll: Poll
  highlight?: string
  // Answers are buttons only when voting is possible: signed in and open.
  onVote?: (optionId: string | null) => void
  // Shown under the answers: the close control, the vote error.
  footer?: React.ReactNode
}

const votesLabel = (count: number) => `${count} ${count === 1 ? "vote" : "votes"}`

// Presentational: numbers, bars and the voter's own pick. Voting, closing and
// errors are wired in QuackPoll, so the welcome page can show the same thing
// read-only.
export function PollView({ poll, highlight, onVote, footer }: PollViewProps) {
  const percentages = pollPercentages(poll.options.map((option) => option.votes))
  const canVote = Boolean(onVote) && !poll.isClosed

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {poll.options.map((option, index) => {
          const percent = percentages?.[index]
          const isMine = option.id === poll.myOptionId
          const content = (
            <>
              {percent !== undefined ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-secondary"
                  // Data-driven width; the class scale can't express it.
                  style={{ width: `${percent}%` }}
                />
              ) : null}
              <span className="relative flex items-center gap-2">
                {isMine ? (
                  <Check
                    aria-hidden="true"
                    className="size-4"
                  />
                ) : null}
                <span className="break-words">
                  <HighlightedText
                    text={option.text}
                    term={highlight}
                  />
                </span>
                {isMine && !canVote ? <span className="sr-only">(your answer)</span> : null}
              </span>
              {percent !== undefined ? (
                <span className="relative shrink-0 text-muted-foreground tabular-nums">
                  {votesLabel(option.votes)} · {percent} %
                </span>
              ) : null}
            </>
          )
          const rowClass = cn(
            "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-sm",
            isMine ? "border-primary" : "border-border",
          )

          return (
            <li key={option.id}>
              {canVote && onVote ? (
                <button
                  type="button"
                  aria-pressed={isMine}
                  // Clicking your own answer again takes the vote back.
                  onClick={() => onVote(isMine ? null : option.id)}
                  className={cn(rowClass, "transition-colors hover:bg-accent")}
                >
                  {content}
                </button>
              ) : (
                <div className={rowClass}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{poll.totalVotes === 0 ? "No votes yet" : votesLabel(poll.totalVotes)}</span>
        {poll.isClosed ? (
          <>
            <span aria-hidden="true">·</span>
            <span>Closed</span>
          </>
        ) : null}
      </div>

      {footer}
    </div>
  )
}
