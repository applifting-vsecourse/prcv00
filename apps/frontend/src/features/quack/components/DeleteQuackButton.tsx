import { useRef } from "react"
import { Trash2 } from "lucide-react"

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

import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type DeleteQuackButtonProps = {
  quackId: string
  // Set when an admin deletes someone else's quack, so the confirmation names
  // whose quack it is. Left out for the signed-in user's own quack.
  author?: { name: string; username: string }
}

// The quack this button sits in vanishes on success, taking focus with it.
// Move it to the next quack (or the previous one, or the page heading) so a
// keyboard user carries on from where they were.
function focusAfterRemoval(trigger: HTMLElement | null) {
  const article = trigger?.closest("article")
  const articles = article?.parentElement
    ? Array.from(article.parentElement.querySelectorAll(":scope > article"))
    : []
  const index = article ? articles.indexOf(article) : -1
  const target =
    articles[index + 1] ?? articles[index - 1] ?? document.querySelector<HTMLElement>("main h1")
  return () =>
    setTimeout(() => {
      if (!(target instanceof HTMLElement) || document.activeElement !== document.body) return
      target.tabIndex = -1
      target.focus()
    })
}

export function DeleteQuackButton({ quackId, author }: DeleteQuackButtonProps) {
  const deleteQuack = useDeleteQuack()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const handleDelete = () => {
    const restoreFocus = focusAfterRemoval(triggerRef.current)
    // mutateAsync, not mutate(…, { onSuccess }): this component unmounts as
    // soon as the quack leaves the feed, and per-call callbacks of an
    // unmounted component never fire. The promise still settles. A failure
    // is shown from deleteQuack.error, so the rejection is handled there.
    void deleteQuack.mutateAsync(quackId).then(restoreFocus, () => undefined)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="sm"
            // Every own quack has one; "Delete quack" tells them apart from the
            // dialog's "Delete" and keeps the visible word in the name.
            aria-label="Delete quack"
            // aria-disabled, not disabled: focus stays put while deleting.
            aria-disabled={deleteQuack.isPending}
            onClick={(event) => {
              if (deleteQuack.isPending) event.preventDefault()
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {author
                ? `Delete ${author.name}'s (@${author.username}) quack?`
                : "Delete this quack?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the feed for everyone, with any question and votes on it. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {deleteQuack.error ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          Couldn&apos;t delete the quack. Try again.
        </p>
      ) : null}
    </div>
  )
}
