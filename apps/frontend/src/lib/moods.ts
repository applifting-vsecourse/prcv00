import { Angry, Frown, Laugh, Smile, type LucideIcon } from "lucide-react"
import { z } from "zod"

// Shared by the quack feed (a quack's mood) and the profile (the mood new
// quacks start with). Mirrors the server-side QuackMood enum.
export const QUACK_MOODS = ["happy", "sad", "angry", "silly"] as const

export const quackMoodSchema = z.enum(QUACK_MOODS)

export type QuackMood = z.infer<typeof quackMoodSchema>

export const moodLabels: Record<QuackMood, { icon: LucideIcon; label: string }> = {
  happy: { icon: Smile, label: "Happy" },
  sad: { icon: Frown, label: "Sad" },
  angry: { icon: Angry, label: "Angry" },
  silly: { icon: Laugh, label: "Silly" },
}
