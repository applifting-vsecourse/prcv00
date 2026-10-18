import { useEffect, useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ListChecks, Loader2, Plus, X } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { moodLabels, QUACK_MOODS, quackMoodSchema, type QuackMood } from "@/lib/moods"
import { cn } from "@/lib/utils"

import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

// Mirror the server-side poll rules (CreatePollDto).
const MIN_ANSWERS = 2
const MAX_ANSWERS = 6
const ANSWER_MAX_LENGTH = 50

const schema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Write something first")
      .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
    mood: quackMoodSchema.nullable(),
    // Empty: a plain quack. Otherwise the quack is the question.
    answers: z.array(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, "Write an answer")
          .max(ANSWER_MAX_LENGTH, `Keep it under ${ANSWER_MAX_LENGTH} characters`),
      }),
    ),
  })
  .superRefine(({ answers }, ctx) => {
    // "Pizza" and "pizza " are the same answer; flag every repeat after the first.
    const seen = new Set<string>()
    answers.forEach(({ text }, index) => {
      const key = text.trim().toLowerCase()
      if (!key) return
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["answers", index, "text"],
          message: "This answer is already on the list",
        })
      }
      seen.add(key)
    })
  })

type FormValues = z.infer<typeof schema>

type QuackFormProps = {
  className?: string
  // The user's default mood from Settings; null or omitted means no mood.
  defaultMood?: QuackMood | null
}

export function QuackForm({ className, defaultMood = null }: QuackFormProps) {
  const addQuack = useAddQuack()
  const moodLabelId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { text: "", mood: defaultMood, answers: [] },
  })
  const answers = useFieldArray({ control: form.control, name: "answers" })
  const isAsking = answers.fields.length > 0

  // The profile can arrive after the form mounts. Follow it, unless the user
  // has already picked a mood for this quack.
  useEffect(() => {
    if (!form.getFieldState("mood").isDirty) {
      form.resetField("mood", { defaultValue: defaultMood })
    }
  }, [defaultMood, form])

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0

  // Nothing here uses `disabled` while posting: a disabled element drops
  // keyboard focus to <body>. Fields go read-only, the button aria-disabled,
  // and the handlers ignore input until the quack is posted.
  const isPosting = addQuack.isPending

  const handleSubmit = (values: FormValues) => {
    if (isPosting) return
    addQuack.mutate(
      {
        text: values.text,
        mood: values.mood,
        poll: values.answers.length ? { options: values.answers.map(({ text }) => text) } : null,
      },
      {
        // Back to an empty quack, no answers, with the default mood picked again.
        onSuccess: () => form.reset({ text: "", mood: defaultMood, answers: [] }),
      },
    )
  }

  // The removed control's button disappears with it, so move focus somewhere
  // sensible instead of letting it fall back to the top of the page.
  const removeAnswer = (index: number) => {
    answers.remove(index)
    setTimeout(() => form.setFocus(`answers.${Math.max(0, index - 1)}.text`))
  }

  // Two empty answers (a question needs at least two), with the cursor in the
  // first. The "Add answers" button is gone once they show, so focus must move.
  const startQuestion = () => {
    answers.append([{ text: "" }, { text: "" }], { shouldFocus: false })
    setTimeout(() => form.setFocus("answers.0.text"))
  }

  const addAnswer = () => {
    const index = answers.fields.length
    answers.append({ text: "" }, { shouldFocus: false })
    setTimeout(() => form.setFocus(`answers.${index}.text`))
  }

  const removeQuestion = () => {
    answers.replace([])
    setTimeout(() => form.setFocus("text"))
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
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New quack</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Quack something..."
                  readOnly={isPosting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isAsking ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">
              Answers people can pick from ({MIN_ANSWERS}–{MAX_ANSWERS})
            </legend>
            {answers.fields.map((item, index) => (
              <FormField
                key={item.id}
                control={form.control}
                name={`answers.${index}.text`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer {index + 1}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          placeholder={index === 0 ? "e.g. Pizza" : undefined}
                          readOnly={isPosting}
                          {...field}
                        />
                      </FormControl>
                      {answers.fields.length > MIN_ANSWERS ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove answer ${index + 1}`}
                          onClick={() => removeAnswer(index)}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <div className="flex flex-wrap gap-2">
              {answers.fields.length < MAX_ANSWERS ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAnswer}
                >
                  <Plus aria-hidden="true" />
                  Add an answer
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeQuestion}
              >
                Remove answers
              </Button>
            </div>
          </fieldset>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startQuestion}
          >
            <ListChecks aria-hidden="true" />
            Add answers
          </Button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel id={moodLabelId}>Mood</FormLabel>
                <FormControl>
                  {/* Single-select that can be cleared: clicking the active
                      icon again emits "", which the form stores as null. */}
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    role="radiogroup"
                    aria-labelledby={moodLabelId}
                    value={field.value ?? ""}
                    onValueChange={(value) => {
                      if (!isPosting) field.onChange(value ? quackMoodSchema.parse(value) : null)
                    }}
                  >
                    {QUACK_MOODS.map((mood) => {
                      const { icon: Icon, label } = moodLabels[mood]
                      return (
                        <ToggleGroupItem
                          key={mood}
                          value={mood}
                          aria-label={label}
                          title={label}
                        >
                          <Icon aria-hidden="true" />
                        </ToggleGroupItem>
                      )
                    })}
                  </ToggleGroup>
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm",
                length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {length}/{MAX_LENGTH}
            </span>
            <Button
              type="submit"
              size="sm"
              aria-disabled={isPosting}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              {isPosting ? <Loader2 className="size-4 animate-spin" /> : null}
              Quack
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
