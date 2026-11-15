import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

// Same limit as a quack (the server's MaxLength(280)); a reply is text only.
const MAX_LENGTH = 280

const schema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
})

type FormValues = z.infer<typeof schema>

type ReplyFormProps = {
  // The quack (or reply) this answers.
  parentId: string
  // Whose quack it answers, for the label ("Reply to @jane").
  replyToUsername: string
  // Called with the posted reply, so the page can move the focus to it.
  onPosted: (reply: Quack) => void
  // Offered for a reply box opened under a reply; the box under the quack
  // that starts the conversation is always there.
  onCancel?: () => void
  // Put the cursor in the box when it appears (the user asked to reply).
  shouldFocus?: boolean
  className?: string
}

export function ReplyForm({
  parentId,
  replyToUsername,
  onPosted,
  onCancel,
  shouldFocus,
  className,
}: ReplyFormProps) {
  const addQuack = useAddQuack()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "" },
  })
  useEffect(() => {
    if (shouldFocus) form.setFocus("text")
  }, [shouldFocus, form])

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0
  // Not `disabled` while posting (focus would drop to <body>); see QuackForm.
  const isPosting = addQuack.isPending

  const handleSubmit = (values: FormValues) => {
    if (isPosting) return
    // mutateAsync: an inline box closes on success, and per-call callbacks of
    // an unmounted component never run (CLAUDE.md).
    void addQuack.mutateAsync({ text: values.text, mood: null, poll: null, parentId }).then(
      (reply) => {
        form.reset({ text: "" })
        onPosted(reply)
      },
      () => undefined,
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              Couldn&apos;t post the reply. {addQuack.error.message}
            </AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reply to @{replyToUsername}</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  readOnly={isPosting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <span
            className={cn(
              "text-sm",
              length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{MAX_LENGTH}
          </span>
          {onCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            size="sm"
            aria-disabled={isPosting}
          >
            {isPosting ? <Loader2 className="size-4 animate-spin" /> : null}
            Reply
          </Button>
        </div>
      </form>
    </Form>
  )
}
