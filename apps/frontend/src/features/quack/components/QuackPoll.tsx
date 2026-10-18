import { useRef } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { PollClosedError } from "@/features/quack/api/pollErrors"
import type { Poll } from "@/features/quack/api/quackSchemas"
import { PollView } from "@/features/quack/components/PollView"
import { closeErrorMessage, useClosePoll } from "@/features/quack/hooks/useClosePoll"
import { useVote, voteErrorMessage } from "@/features/quack/hooks/useVote"

type QuackPollProps = {
  poll: Poll
  highlight?: string
  // Only the author may close the question.
  isAuthor: boolean
}

export function QuackPoll({ poll, highlight, isAuthor }: QuackPollProps) {
  const vote = useVote(poll.id)
  const close = useClosePoll(poll.id)
  const pollRef = useRef<HTMLDivElement>(null)

  const error = vote.error
    ? voteErrorMessage(vote.error)
    : close.error && !(close.error instanceof PollClosedError)
      ? closeErrorMessage
      : null

  // Closing removes the "Close question" button the dialog would hand focus
  // back to; land on the now-closed question instead of the top of the page.
  const handleClose = () =>
    close.mutate(undefined, {
      onSettled: () =>
        setTimeout(() => {
          if (document.activeElement === document.body) pollRef.current?.focus()
        }),
    })

  return (
    <div
      ref={pollRef}
      role="group"
      aria-label="Answers"
      tabIndex={-1}
      className="rounded-md"
    >
      <PollView
        poll={poll}
        highlight={highlight}
        onVote={(optionId) => vote.mutate(optionId)}
        footer={
          <>
            {/* Under this question only: one failed vote must not alarm the page. */}
            {error ? (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
            {isAuthor && !poll.isClosed ? (
              <ClosePollButton
                onConfirm={handleClose}
                isClosing={close.isPending}
              />
            ) : null}
          </>
        }
      />
    </div>
  )
}

type ClosePollButtonProps = {
  onConfirm: () => void
  isClosing: boolean
}

function ClosePollButton({ onConfirm, isClosing }: ClosePollButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          // aria-disabled, not disabled: focus stays put while it closes.
          aria-disabled={isClosing}
        >
          Close question
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            Nobody will be able to vote or change their vote any more. The results stay visible. A
            closed question can&apos;t be opened again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it open</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Close question</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
