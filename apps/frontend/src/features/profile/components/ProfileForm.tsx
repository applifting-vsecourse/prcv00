import { useId } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { moodLabels, QUACK_MOODS, quackMoodSchema, type QuackMood } from "@/lib/moods"
import { cn } from "@/lib/utils"

import { UsernameTakenError } from "@/features/profile/api/profileErrors"
import type { Profile } from "@/features/profile/api/profileSchemas"
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile"

// Mirrors the server-side DTO so the user is told before the request is made —
// the server still validates independently (and alone knows what is taken).
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30
const NAME_MAX_LENGTH = 50
const BIO_MAX_LENGTH = 160

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(USERNAME_MIN_LENGTH, `Use at least ${USERNAME_MIN_LENGTH} characters`)
    .max(USERNAME_MAX_LENGTH, `Use at most ${USERNAME_MAX_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9._]+$/, "Use only letters, numbers, dots and underscores"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters`),
  bio: z.string().trim().max(BIO_MAX_LENGTH, `Keep it under ${BIO_MAX_LENGTH} characters`),
  defaultQuackMood: quackMoodSchema.nullable(),
})

type FormValues = z.infer<typeof schema>

// Radio values are strings, so "no mood" needs a name of its own.
const NO_MOOD = "none"

const moodOptions = [
  { value: NO_MOOD, label: "None", icon: null },
  ...QUACK_MOODS.map((mood) => ({ value: mood, ...moodLabels[mood] })),
]

// The kit's Button styles only `disabled`; mirror that look for aria-disabled.
const ariaDisabledStyle = "aria-disabled:cursor-not-allowed aria-disabled:opacity-50"

const toFormValues = (profile: Profile): FormValues => ({
  username: profile.username,
  name: profile.name,
  bio: profile.bio ?? "",
  defaultQuackMood: profile.defaultQuackMood,
})

const toMood = (value: string): QuackMood | null =>
  value === NO_MOOD ? null : quackMoodSchema.parse(value)

type ProfileFormProps = { profile: Profile }

export function ProfileForm({ profile }: ProfileFormProps) {
  const updateProfile = useUpdateProfile()
  const moodLabelId = useId()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(profile),
  })

  const bio = useWatch({ control: form.control, name: "bio" })
  const bioLength = bio?.length ?? 0
  const { isDirty } = form.formState
  const isSaving = updateProfile.isPending
  // Nothing here uses the `disabled` attribute: a disabled element drops
  // keyboard focus to <body>, so someone who pressed Enter, Save or Discard
  // would be thrown back to the top of the page. Fields go read-only and
  // buttons aria-disabled instead, and the handlers ignore them.
  const canDiscard = isDirty && !isSaving

  const handleSubmit = (values: FormValues) => {
    if (isSaving) return
    updateProfile.mutate(
      { ...values, bio: values.bio || null },
      {
        onSuccess: (saved) => {
          // What was just saved becomes what "Discard changes" returns to.
          form.reset(toFormValues(saved))
          toast.success("Settings saved")
        },
        onError: (error) => {
          // Keep what the user typed; just say what's wrong, next to the field.
          if (error instanceof UsernameTakenError) {
            form.setError("username", { message: error.message }, { shouldFocus: true })
          }
        },
      },
    )
  }

  const handleDiscard = () => {
    if (!canDiscard) return
    form.reset()
    updateProfile.reset()
  }

  const otherError =
    updateProfile.error && !(updateProfile.error instanceof UsernameTakenError)
      ? updateProfile.error
      : null

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-6"
      >
        {otherError ? (
          <Alert variant="destructive">
            <AlertDescription>{otherError.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  readOnly={isSaving}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                People see it as @{field.value || "username"}. 3–30 characters: letters, numbers,
                dots and underscores.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  readOnly={isSaving}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="e.g. Three espressos in and still quacking."
                  readOnly={isSaving}
                  {...field}
                />
              </FormControl>
              <div className="flex justify-between gap-3">
                <FormDescription>Optional.</FormDescription>
                <span
                  className={cn(
                    "text-sm",
                    bioLength > BIO_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {bioLength}/{BIO_MAX_LENGTH}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultQuackMood"
          render={({ field }) => (
            <FormItem>
              <FormLabel id={moodLabelId}>Default mood for new quacks</FormLabel>
              <FormControl>
                <RadioGroup
                  aria-labelledby={moodLabelId}
                  value={field.value ?? NO_MOOD}
                  onValueChange={(value) => {
                    if (!isSaving) field.onChange(toMood(value))
                  }}
                  className="flex flex-wrap gap-4"
                >
                  {moodOptions.map(({ value, label, icon: Icon }) => (
                    <div
                      key={value}
                      className="flex items-center gap-2"
                    >
                      <RadioGroupItem
                        value={value}
                        id={`${moodLabelId}-${value}`}
                      />
                      <Label
                        htmlFor={`${moodLabelId}-${value}`}
                        className="font-normal"
                      >
                        {Icon ? (
                          <Icon
                            aria-hidden="true"
                            className="size-4"
                          />
                        ) : null}
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Picked for you when you write a quack. You can still change it each time.
              </FormDescription>
            </FormItem>
          )}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            aria-disabled={isSaving}
            className={ariaDisabledStyle}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            aria-disabled={!canDiscard}
            className={ariaDisabledStyle}
          >
            Discard changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
