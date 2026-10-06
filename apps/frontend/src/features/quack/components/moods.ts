import { Angry, Frown, Laugh, Smile, type LucideIcon } from "lucide-react"

import type { QuackMood } from "@/features/quack/api/quackSchemas"

export const moodLabels: Record<QuackMood, { icon: LucideIcon; label: string }> = {
  happy: { icon: Smile, label: "Happy" },
  sad: { icon: Frown, label: "Sad" },
  angry: { icon: Angry, label: "Angry" },
  silly: { icon: Laugh, label: "Silly" },
}
