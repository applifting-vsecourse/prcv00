import type { QuackMood } from "@/features/quack/api/quackSchemas"
import { moodLabels } from "@/features/quack/components/moods"

type QuackMoodBadgeProps = { mood: QuackMood }

export function QuackMoodBadge({ mood }: QuackMoodBadgeProps) {
  const { emoji, label } = moodLabels[mood]

  return (
    <span className="text-xs text-muted-foreground">
      <span aria-hidden="true">{emoji}</span> {label}
    </span>
  )
}
